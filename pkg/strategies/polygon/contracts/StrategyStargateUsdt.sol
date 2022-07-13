// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./core/Strategy.sol";
import "./libraries/OvnMath.sol";
import "./exchanges/UniswapV2Exchange.sol";
import "./exchanges/SynapseExchange.sol";
import "./connectors/stargate/interfaces/IStargateRouter.sol";
import "./connectors/stargate/interfaces/IPool.sol";
import "./connectors/stargate/interfaces/ILPStaking.sol";


contract StrategyStargateUsdt is Strategy, UniswapV2Exchange, SynapseExchange {
    using OvnMath for uint256;

    IERC20 public usdcToken;
    IERC20 public usdtToken;
    IERC20 public stgToken;

    IStargateRouter public stargateRouter;
    IPool public pool;
    ILPStaking public lpStaking;
    uint256 public pid;


    // --- events

    event StrategyUpdatedTokens(address usdcToken, address usdtToken, address stgToken);

    event StrategyUpdatedParams(address stargateRouter, address pool, address lpStaking, uint256 pid, address sushiSwapRouter, address synapseSwap);


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setTokens(
        address _usdcToken,
        address _usdtToken,
        address _stgToken
    ) external onlyAdmin {

        require(_usdcToken != address(0), "Zero address not allowed");
        require(_usdtToken != address(0), "Zero address not allowed");
        require(_stgToken != address(0), "Zero address not allowed");

        usdcToken = IERC20(_usdcToken);
        usdtToken = IERC20(_usdtToken);
        stgToken = IERC20(_stgToken);

        emit StrategyUpdatedTokens(_usdcToken, _usdtToken, _stgToken);
    }

    function setParams(
        address _stargateRouter,
        address _pool,
        address _lpStaking,
        uint256 _pid,
        address _sushiSwapRouter,
        address _synapseSwap
    ) external onlyAdmin {

        require(_stargateRouter != address(0), "Zero address not allowed");
        require(_pool != address(0), "Zero address not allowed");
        require(_lpStaking != address(0), "Zero address not allowed");
        require(_sushiSwapRouter != address(0), "Zero address not allowed");
        require(_synapseSwap != address(0), "Zero address not allowed");

        stargateRouter = IStargateRouter(_stargateRouter);
        pool = IPool(_pool);
        lpStaking = ILPStaking(_lpStaking);
        pid = _pid;
        _setUniswapRouter(_sushiSwapRouter);
        _setSynapseSwap(_synapseSwap);

        emit StrategyUpdatedParams(_stargateRouter, _pool, _lpStaking, _pid, _sushiSwapRouter, _synapseSwap);
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(usdcToken), "Some token not compatible");

        // swap usdc to usdt
        uint256 usdcBalance = usdcToken.balanceOf(address(this));
        _synapseSwap(address(usdcToken), address(usdtToken), usdcBalance);

        // add liquidity
        uint256 usdtBalance = usdtToken.balanceOf(address(this));
        usdtToken.approve(address(stargateRouter), usdtBalance);
        stargateRouter.addLiquidity(uint16(pool.poolId()), usdtBalance, address(this));

        // stake
        uint256 lpBalance = pool.balanceOf(address(this));
        pool.approve(address(lpStaking), lpBalance);
        lpStaking.deposit(pid, lpBalance);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        // unstake
        uint256 usdcAmount = _amount.addBasisPoints(4) + 10;
        uint256 usdtAmount = _synapseCalculateSwap(address(usdcToken), address(usdtToken), usdcAmount);
        uint256 lpBalance = usdtAmount * 1e6 / pool.amountLPtoLD(1e6);
        (uint256 amount,) = lpStaking.userInfo(pid, address(this));
        if (lpBalance > amount) {
            lpBalance = amount;
        }
        lpStaking.withdraw(pid, lpBalance);

        // remove liquidity
        pool.approve(address(stargateRouter), lpBalance);
        stargateRouter.instantRedeemLocal(uint16(pool.poolId()), lpBalance, address(this));

        // swap usdt to usdc
        uint256 usdtBalance = usdtToken.balanceOf(address(this));
        _synapseSwap(address(usdtToken), address(usdcToken), usdtBalance);

        return usdcToken.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        // unstake
        (uint256 amount,) = lpStaking.userInfo(pid, address(this));
        if (amount == 0) {
            return usdcToken.balanceOf(address(this));
        }
        lpStaking.withdraw(pid, amount);

        // remove liquidity
        pool.approve(address(stargateRouter), amount);
        stargateRouter.instantRedeemLocal(uint16(pool.poolId()), amount, address(this));

        // swap usdt to usdc
        uint256 usdtBalance = usdtToken.balanceOf(address(this));
        _synapseSwap(address(usdtToken), address(usdcToken), usdtBalance);

        return usdcToken.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue(true);
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue(false);
    }

    function _totalValue(bool nav) internal view returns (uint256) {
        uint256 usdcBalance = usdcToken.balanceOf(address(this));

        (uint256 amount,) = lpStaking.userInfo(pid, address(this));
        if (amount > 0) {
            uint256 usdtBalance = pool.amountLPtoLD(amount);
            if (nav) {
                usdcBalance += _synapseCalculateSwap(address(usdtToken), address(usdcToken), 1e6) * usdtBalance / 1e6;
            } else {
                usdcBalance += _synapseCalculateSwap(address(usdtToken), address(usdcToken), usdtBalance);
            }
        }

        return usdcBalance;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        (uint256 amount,) = lpStaking.userInfo(pid, address(this));
        if (amount == 0) {
            return 0;
        }
        lpStaking.withdraw(pid, 0);

        // sell rewards
        uint256 totalUsdc;

        uint256 stgBalance = stgToken.balanceOf(address(this));
        if (stgBalance > 0) {
            uint256 stgUsdc = _swapExactTokensForTokens(
                address(stgToken),
                address(usdcToken),
                stgBalance,
                address(this)
            );
            totalUsdc += stgUsdc;
        }

        if (totalUsdc > 0) {
            usdcToken.transfer(_to, totalUsdc);
        }

        return totalUsdc;
    }

}
