// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/core/contracts/interfaces/IUsdPlusToken.sol";
import "@overnight-contracts/core/contracts/interfaces/IExchange.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/Gmx.sol";
import "@overnight-contracts/connectors/contracts/stuff/Zyberswap.sol";

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

        dai.approve(address(zyberPool), daiBalance);
        zyberPool.swap(
            2, // DAI
            0, // USDC
            daiBalance,
            amountOutMin,
            block.timestamp
        );

        // mint usdPlus
        uint256 usdcBalance = usdc.balanceOf(address(this));
        usdc.approve(address(exchange), usdcBalance);
        IExchange.MintParams memory params = IExchange.MintParams({
            asset: address(usdc),
            amount: usdcBalance,
            referral: ""
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

        // swap usdc to dai
        uint256 usdcBalance = usdc.balanceOf(address(this));
        uint256 amountOutMin = OvnMath.subBasisPoints(_oracleUsdcToDai(usdcBalance), swapSlippageBP);

        usdc.approve(address(zyberPool), usdcBalance);
        zyberPool.swap(
            0, // USDC
            2, // DAI
            usdcBalance,
            amountOutMin,
            block.timestamp
        );

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

        // swap usdc to dai
        uint256 usdcBalance = usdc.balanceOf(address(this));
        uint256 amountOutMin = OvnMath.subBasisPoints(_oracleUsdcToDai(usdcBalance), swapSlippageBP);

        usdc.approve(address(zyberPool), usdcBalance);
        zyberPool.swap(
            0, // USDC
            2, // DAI
            usdcBalance,
            amountOutMin,
            block.timestamp
        );

        return dai.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        uint256 usdPlusBalance = usdPlus.balanceOf(address(this));
        return dai.balanceOf(address(this)) + _oracleUsdcToDai(usdPlusBalance);
    }

    function liquidationValue() external view override returns (uint256) {
        uint256 usdPlusBalance = usdPlus.balanceOf(address(this));
        return dai.balanceOf(address(this)) + OvnMath.subBasisPoints(_oracleUsdcToDai(usdPlusBalance), 4 + swapSlippageBP); // unstake 0.04% + swap slippage
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
