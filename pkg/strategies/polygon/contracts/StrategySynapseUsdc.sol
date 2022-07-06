// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./core/Strategy.sol";
import "./libraries/OvnMath.sol";
import "./exchanges/UniswapV2Exchange.sol";
import "./connectors/synapse/interfaces/ISwap.sol";
import "./connectors/synapse/interfaces/IMiniChefV2.sol";


contract StrategySynapseUsdc is Strategy, UniswapV2Exchange {
    using OvnMath for uint256;

    IERC20 public usdcToken;
    IERC20 public nUsdLPToken;
    IERC20 public synToken;

    ISwap public swap;
    IMiniChefV2 public miniChefV2;
    uint256 public pid;


    // --- events

    event StrategyUpdatedTokens(address usdcToken, address nUsdLPToken, address synToken);

    event StrategyUpdatedParams(address swap, address miniChefV2, address sushiSwapRouter, uint256 pid);


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setTokens(
        address _usdcToken,
        address _nUsdLPToken,
        address _synToken
    ) external onlyAdmin {

        require(_usdcToken != address(0), "Zero address not allowed");
        require(_nUsdLPToken != address(0), "Zero address not allowed");
        require(_synToken != address(0), "Zero address not allowed");

        usdcToken = IERC20(_usdcToken);
        nUsdLPToken = IERC20(_nUsdLPToken);
        synToken = IERC20(_synToken);

        emit StrategyUpdatedTokens(_usdcToken, _nUsdLPToken, _synToken);
    }

    function setParams(
        address _swap,
        address _miniChefV2,
        address _sushiSwapRouter,
        uint64 _pid
    ) external onlyAdmin {

        require(_swap != address(0), "Zero address not allowed");
        require(_miniChefV2 != address(0), "Zero address not allowed");
        require(_sushiSwapRouter != address(0), "Zero address not allowed");
        require(_pid != 0, "Zero value not allowed");

        swap = ISwap(_swap);
        miniChefV2 = IMiniChefV2(_miniChefV2);
        _setUniswapRouter(_sushiSwapRouter);
        pid = _pid;

        emit StrategyUpdatedParams(_swap, _miniChefV2, _sushiSwapRouter, _pid);
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(usdcToken), "Some token not compatible");

        // add liquidity
        uint256[] memory amounts = new uint256[](4);
        amounts[0] = 0;
        amounts[1] = 0;
        amounts[2] = _amount.subBasisPoints(4);
        amounts[3] = 0;
        uint256 minToMint = swap.calculateTokenAmount(amounts, true);
        amounts[2] = _amount;
        usdcToken.approve(address(swap), _amount);
        uint256 nUsdLPTokenAmount = swap.addLiquidity(amounts, minToMint, block.timestamp);

        // stake
        nUsdLPToken.approve(address(miniChefV2), nUsdLPTokenAmount);
        miniChefV2.deposit(pid, nUsdLPTokenAmount, address(this));
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        // unstake
        uint256[] memory amounts = new uint256[](4);
        amounts[0] = 0;
        amounts[1] = 0;
        amounts[2] = _amount.addBasisPoints(4) + 1;
        amounts[3] = 0;
        uint256 balanceLP = swap.calculateTokenAmount(amounts, false);
        (uint256 amount,) = miniChefV2.userInfo(pid, address(this));
        if (balanceLP > amount) {
            balanceLP = amount;
        }
        miniChefV2.withdraw(pid, balanceLP, address(this));

        // remove liquidity
        nUsdLPToken.approve(address(swap), balanceLP);
        swap.removeLiquidityOneToken(balanceLP, 2, _amount, block.timestamp);

        return usdcToken.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        // unstake
        (uint256 amount,) = miniChefV2.userInfo(pid, address(this));
        if (amount == 0) {
            return usdcToken.balanceOf(address(this));
        }
        miniChefV2.withdraw(pid, amount, address(this));

        // remove liquidity
        uint256 usdcBalance = swap.calculateRemoveLiquidityOneToken(amount, 2);
        nUsdLPToken.approve(address(swap), amount);
        swap.removeLiquidityOneToken(amount, 2, usdcBalance, block.timestamp);

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

        (uint256 amount,) = miniChefV2.userInfo(pid, address(this));
        if (amount > 0) {
            if (nav) {
                usdcBalance += swap.calculateRemoveLiquidityOneToken(1e18, 2) * amount / 1e18;
            } else {
                usdcBalance += swap.calculateRemoveLiquidityOneToken(amount, 2);
            }
        }

        return usdcBalance;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        (uint256 amount,) = miniChefV2.userInfo(pid, address(this));
        if (amount == 0) {
            return 0;
        }
        miniChefV2.harvest(pid, address(this));

        // sell rewards
        uint256 totalUsdc;

        uint256 synBalance = synToken.balanceOf(address(this));
        if (synBalance > 0) {
            uint256 synUsdc = _swapExactTokensForTokens(
                address(synToken),
                address(usdcToken),
                synBalance,
                address(this)
            );
            totalUsdc += synUsdc;
        }

        uint256 usdcBalance = usdcToken.balanceOf(address(this));
        if (usdcBalance > 0) {
            usdcToken.transfer(_to, usdcBalance);
        }

        return totalUsdc;
    }

}
