// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/core/contracts/interfaces/IUsdPlusToken.sol";
import "@overnight-contracts/core/contracts/interfaces/IExchange.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/Gmx.sol";
import "@overnight-contracts/connectors/contracts/stuff/Zyberswap.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";

import "hardhat/console.sol";

contract StrategyUsdPlusDai is Strategy {

    // --- structs

    struct StrategyParams {
        address usdc;
        address dai;
        address usdPlus;
        address exchange;
        address oracleDai;
        address oracleUsdc;
        address gmxRouter;
        address zyberPool;
        address uniswapV3Router;
        uint24 poolFee;
        address gmxVault;
    }

    // --- params

    IERC20 public dai;
    IERC20 public usdc;
    uint256 public daiDm;
    uint256 public usdcDm;
    IUsdPlusToken public usdPlus;
    IExchange public exchange;
    IPriceFeed public oracleDai;
    IPriceFeed public oracleUsdc;
    IRouter public gmxRouter;
    IZyberSwap public zyberPool;
    ISwapRouter public uniswapV3Router;
    uint24 public poolFee;
    IVault public gmxVault;

    // --- events

    event StrategyUpdatedParams();

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }

    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        dai = IERC20(params.dai);
        usdc = IERC20(params.usdc);
        usdPlus = IUsdPlusToken(params.usdPlus);
        exchange = IExchange(params.exchange);
        oracleDai = IPriceFeed(params.oracleDai);
        oracleUsdc = IPriceFeed(params.oracleUsdc);
        gmxRouter = IRouter(params.gmxRouter);
        zyberPool = IZyberSwap(params.zyberPool);
        uniswapV3Router = ISwapRouter(params.uniswapV3Router);
        gmxVault = IVault(params.gmxVault);
        poolFee = params.poolFee;

        daiDm = 10 ** IERC20Metadata(params.dai).decimals();
        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        // swap dai to usdc

        uint256 daiBalance = dai.balanceOf(address(this));
        uint256 amountOutMin = OvnMath.subBasisPoints(_oracleDaiToUsdc(daiBalance), swapSlippageBP);

        // Gmx Vault has max limit for accepting tokens, for example DAI max capacity: 35kk$
        // If after swap vault of balance more capacity then transaction revert
        // We check capacity and if it not enough then use other swap route (UniswapV3)

        if (gmxVault.maxUsdgAmounts(address(dai)) > daiBalance + gmxVault.poolAmounts(address(dai))) {
            dai.approve(address(gmxRouter), daiBalance);

            address[] memory path = new address[](2);
            path[0] = address(dai);
            path[1] = address(usdc);

            gmxRouter.swap(path, daiBalance, amountOutMin, address(this));
        } else {
            dai.approve(address(uniswapV3Router), daiBalance);

            UniswapV3Library.singleSwap(
                uniswapV3Router,
                address(dai),
                address(usdc),
                poolFee,
                address(this),
                daiBalance,
                amountOutMin
            );
        }


        // mint usdPlus
        uint256 usdcBalance = usdc.balanceOf(address(this));
        usdc.approve(address(exchange), usdcBalance);
        IExchange.MintParams memory params = IExchange.MintParams({
        asset : address(usdc),
        amount : usdcBalance,
        referral : ""
        });

        exchange.mint(params);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        uint256 usdPlusBalance = usdPlus.balanceOf(address(this));
        if (usdPlusBalance == 0) {
            return 0;
        }

        // add 1 bp and 1e13 for swap slippage
        uint256 usdPlusAmount = OvnMath.addBasisPoints(_oracleDaiToUsdc(_amount + 1e13), swapSlippageBP);
        if (usdPlusAmount >= usdPlusBalance) {
            usdPlusAmount = usdPlusBalance;
        }

        // redeem usdPlus
        exchange.redeem(address(usdc), usdPlusAmount);
        uint256 usdcBalance = usdc.balanceOf(address(this));
        uint256 amountOutMin = OvnMath.subBasisPoints(_oracleUsdcToDai(usdcBalance), swapSlippageBP);

        // Why this is done -> see comments in method: stake
        if (gmxVault.maxUsdgAmounts(address(usdc)) > usdcBalance + gmxVault.poolAmounts(address(usdc))) {
            // swap usdc to dai
            address[] memory path = new address[](2);
            path[0] = address(usdc);
            path[1] = address(dai);

            usdc.approve(address(gmxRouter), usdcBalance);
            gmxRouter.swap(path, usdcBalance, amountOutMin, address(this));
        } else {
            usdc.approve(address(uniswapV3Router), usdcBalance);

            UniswapV3Library.singleSwap(
                uniswapV3Router,
                address(usdc),
                address(dai),
                poolFee,
                address(this),
                usdcBalance,
                amountOutMin
            );
        }


        return dai.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        uint256 usdPlusBalance = usdPlus.balanceOf(address(this));
        if (usdPlusBalance == 0) {
            return 0;
        }

        // redeem usdPlus
        exchange.redeem(address(usdc), usdPlusBalance);

        uint256 usdcBalance = usdc.balanceOf(address(this));
        uint256 amountOutMin = OvnMath.subBasisPoints(_oracleUsdcToDai(usdcBalance), swapSlippageBP);

        // Why this is done -> see comments in method: stake
        if (gmxVault.maxUsdgAmounts(address(usdc)) > usdcBalance + gmxVault.poolAmounts(address(usdc))) {
            // swap usdc to dai
            address[] memory path = new address[](2);
            path[0] = address(usdc);
            path[1] = address(dai);

            usdc.approve(address(gmxRouter), usdcBalance);
            gmxRouter.swap(path, usdcBalance, amountOutMin, address(this));
        } else {
            usdc.approve(address(uniswapV3Router), usdcBalance);

            UniswapV3Library.singleSwap(
                uniswapV3Router,
                address(usdc),
                address(dai),
                poolFee,
                address(this),
                usdcBalance,
                amountOutMin
            );
        }
        return dai.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        uint256 usdPlusBalance = usdPlus.balanceOf(address(this));
        return dai.balanceOf(address(this)) + _oracleUsdcToDai(usdPlusBalance);
    }

    function liquidationValue() external view override returns (uint256) {
        uint256 usdPlusBalance = usdPlus.balanceOf(address(this));
        return dai.balanceOf(address(this)) + OvnMath.subBasisPoints(_oracleUsdcToDai(usdPlusBalance), 4); // unstake 0.04%
    }

    function _claimRewards(address _to) internal override returns (uint256) {
        return 0;
    }

    function _oracleDaiToUsdc(uint256 daiAmount) internal view returns (uint256) {
        uint256 priceDai = ChainlinkLibrary.getPrice(oracleDai);
        uint256 priceUsdc = ChainlinkLibrary.getPrice(oracleUsdc);
        return ChainlinkLibrary.convertTokenToToken(daiAmount, daiDm, usdcDm, priceDai, priceUsdc);
    }

    function _oracleUsdcToDai(uint256 usdcAmount) internal view returns (uint256) {
        uint256 priceDai = ChainlinkLibrary.getPrice(oracleDai);
        uint256 priceUsdc = ChainlinkLibrary.getPrice(oracleUsdc);
        return ChainlinkLibrary.convertTokenToToken(usdcAmount, usdcDm, daiDm, priceUsdc, priceDai);
    }
}
