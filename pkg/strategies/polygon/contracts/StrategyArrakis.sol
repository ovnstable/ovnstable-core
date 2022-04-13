// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

import "./core/Strategy.sol";

import "./exchanges/QuickSwapExchange.sol";

import "./connectors/uniswap/v3/interfaces/INonfungiblePositionManager.sol";
import "./connectors/uniswap/v3/interfaces/IUniswapV3Pool.sol";
import "./connectors/uniswap/v3/interfaces/ISwapRouterV3.sol";
import "./connectors/uniswap/v3/libraries/LiquidityAmounts.sol";

import "./connectors/arrakis/IArrakisV1RouterStaking.sol";
import "./connectors/arrakis/IArrakisRewards.sol";

import "hardhat/console.sol";
import "./exchanges/BalancerExchange.sol";

contract StrategyIzumi is Strategy, BalancerExchange {


    IERC20 public usdcToken;
    IERC20 public usdtToken;
    IERC20 public wmaticToken;

    IArrakisV1RouterStaking arrakisRouter;
    IArrakisRewards arrakisRewards;

    IUniswapV3Pool uniswapV3Pool;


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
        address _wmaticToken
    ) external onlyAdmin {

        require(_usdcToken != address(0), "Zero address not allowed");
        require(_usdtToken != address(0), "Zero address not allowed");
        require(_wmaticToken != address(0), "Zero address not allowed");

        usdcToken = IERC20(_usdcToken);
        usdtToken = IERC20(_usdtToken);
        wmaticToken = IERC20(_wmaticToken);
    }

    function setParams(
        address _arrakisRouter,
        address _arrakisRewards
    ) external onlyAdmin {

        require(_arrakisRouter != address(0), "Zero address not allowed");
        require(_arrakisRewards != address(0), "Zero address not allowed");

        arrakisRouter = IArrakisV1RouterStaking(_arrakisRouter);
        arrakisRewards = IArrakisRewards(_arrakisRewards);

    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
        require(_asset == address(usdcToken), "Some token not compatible");

        _getNeedToByUsdt(_amount);

        uint256 usdcAmount = usdcToken.balanceOf(address(this));
        uint256 usdtAmount = usdtToken.balanceOf(address(this));

        arrakisRouter.addLiquidityAndStake(address(arrakisGauge), usdcAmount, usdtAmount,  (usdcAmount * 95 / 100), (usdtAmount * 95 / 100), address(this));
    }


    function _getNeedToByUsdt(uint256 _amount) internal returns (uint256){

        (uint160 sqrtPriceX96,,,,,,) = uniswapV3Pool.slot0();

        (uint256 amountLiq0, uint256 amountLiq1) = LiquidityAmounts.getAmountsForLiquidity(
            sqrtPriceX96,
            MIN_SQRT_RATIO,
            MAX_SQRT_RATIO,
            uniswapV3Pool.liquidity());

        if (amountLiq0 >= amountLiq1) {

            uint256 ratio = (amountLiq0 * 10 ** 18) / amountLiq1;
            uint256 usdcBalance = _amount;
            uint256 needUsdtValue = (usdcBalance * 10 ** 18) / (ratio + 10 ** 18);
            // t=N/(r+1)
            return needUsdtValue;
        } else {
            revert("Amount liquidity USDT more then USDC");
        }
    }

    function _buyNeedAmountUsdt() internal {

        uint256 neededUsdtBalance = _getNeedToByUsdt(usdcToken.balanceOf(address(this)));
        uint256 currentUsdtBalance = usdtToken.balanceOf(address(this));

        if (currentUsdtBalance <= neededUsdtBalance) {
            neededUsdtBalance = neededUsdtBalance - currentUsdtBalance;
            swap(balancerPoolId, IVault.SwapKind.GIVEN_OUT, IAsset(address(usdcToken)), IAsset(address(usdtToken)), address(this), address(this), neededUsdtBalance);
        }

    }


    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        require(_asset == address(usdcToken), "Some token not compatible");

        return 0;
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        require(_asset == address(usdcToken), "Some token not compatible");
        return 0;
    }




    function netAssetValue() external override view returns (uint256) {
        return 0;
    }

    function liquidationValue() external override view returns (uint256) {
        return 0;
    }



    function _claimRewards(address _to) internal override returns (uint256) {
        return 0;
    }




}
