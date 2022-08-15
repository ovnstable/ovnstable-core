// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "../libraries/OvnMath.sol";
import "../libraries/PancakeSwapLibrary.sol";
import "../connectors/stargate/interfaces/IStargateRouter.sol";
import "../connectors/stargate/interfaces/IStargatePool.sol";
import "../connectors/stargate/interfaces/ILPStaking.sol";


contract StrategyStargateUsdt is Strategy {
    using OvnMath for uint256;

    IERC20 public usdtToken;
    IERC20 public stgToken;

    IStargateRouter public stargateRouter;
    IStargatePool public pool;
    ILPStaking public lpStaking;
    IPancakeRouter02 public pancakeRouter;
    uint256 public pid;


    // --- events

    event StrategyUpdatedTokens(address usdtToken, address stgToken);

    event StrategyUpdatedParams(address stargateRouter, address pool, address lpStaking, address pancakeRouter, uint256 pid);


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setTokens(
        address _usdtToken,
        address _stgToken
    ) external onlyAdmin {

        require(_usdtToken != address(0), "Zero address not allowed");
        require(_stgToken != address(0), "Zero address not allowed");

        usdtToken = IERC20(_usdtToken);
        stgToken = IERC20(_stgToken);

        emit StrategyUpdatedTokens(_usdtToken, _stgToken);
    }

    function setParams(
        address _stargateRouter,
        address _pool,
        address _lpStaking,
        address _pancakeRouter,
        uint256 _pid
    ) external onlyAdmin {

        require(_stargateRouter != address(0), "Zero address not allowed");
        require(_pool != address(0), "Zero address not allowed");
        require(_lpStaking != address(0), "Zero address not allowed");
        require(_pancakeRouter != address(0), "Zero address not allowed");

        stargateRouter = IStargateRouter(_stargateRouter);
        pool = IStargatePool(_pool);
        lpStaking = ILPStaking(_lpStaking);
        pancakeRouter = IPancakeRouter02(_pancakeRouter);
        pid = _pid;

        emit StrategyUpdatedParams(_stargateRouter, _pool, _lpStaking, _pancakeRouter, _pid);
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(usdtToken), "Some token not compatible");

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

        require(_asset == address(usdtToken), "Some token not compatible");

        // unstake
        uint256 usdtAmount = _amount + 10;
        uint256 lpBalance = usdtAmount * 1e6 / pool.amountLPtoLD(1e6);
        (uint256 amount,) = lpStaking.userInfo(pid, address(this));
        if (lpBalance > amount) {
            lpBalance = amount;
        }
        lpStaking.withdraw(pid, lpBalance);

        // remove liquidity
        pool.approve(address(stargateRouter), lpBalance);
        stargateRouter.instantRedeemLocal(uint16(pool.poolId()), lpBalance, address(this));

        return usdtToken.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdtToken), "Some token not compatible");

        // unstake
        (uint256 amount,) = lpStaking.userInfo(pid, address(this));
        if (amount == 0) {
            return usdtToken.balanceOf(address(this));
        }
        lpStaking.withdraw(pid, amount);

        // remove liquidity
        pool.approve(address(stargateRouter), amount);
        stargateRouter.instantRedeemLocal(uint16(pool.poolId()), amount, address(this));

        return usdtToken.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        uint256 usdtBalance = usdtToken.balanceOf(address(this));

        (uint256 amount,) = lpStaking.userInfo(pid, address(this));
        if (amount > 0) {
            usdtBalance += pool.amountLPtoLD(amount);
        }

        return usdtBalance;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        (uint256 amount,) = lpStaking.userInfo(pid, address(this));
        if (amount == 0) {
            return 0;
        }
        lpStaking.withdraw(pid, 0);

        // sell rewards
        uint256 totalUsdt;

        uint256 stgBalance = stgToken.balanceOf(address(this));
        if (stgBalance > 0) {
            uint256 amountOutMin = PancakeSwapLibrary.getAmountsOut(
                pancakeRouter,
                address(stgToken),
                address(usdtToken),
                stgBalance
            );

            if (amountOutMin > 0) {
                uint256 stgUsdt = PancakeSwapLibrary.swapExactTokensForTokens(
                    pancakeRouter,
                    address(stgToken),
                    address(usdtToken),
                    stgBalance,
                    amountOutMin,
                    address(this)
                );
                totalUsdt += stgUsdt;
            }
        }

        if (totalUsdt > 0) {
            usdtToken.transfer(_to, totalUsdt);
        }

        return totalUsdt;
    }

}
