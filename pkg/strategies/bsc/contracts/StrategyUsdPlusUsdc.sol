// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/core/contracts/interfaces/IUsdPlusToken.sol";
import "@overnight-contracts/core/contracts/interfaces/IExchange.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/PancakeV3.sol";

contract StrategyUsdPlusUsdc is Strategy {

    // --- structs

    struct StrategyParams {
        address usdc;
        address usdt;
        address usdPlus;
        address exchange;
        address oracleUsdc;
        address oracleUsdt;
        address pancakeSwapV3Router;
    }

    // --- params

    IERC20 public usdc;
    IERC20 public usdt;
    
    IUsdPlusToken public usdPlus;
    IExchange public exchange;
    
    IPriceFeed public oracleUsdc;
    IPriceFeed public oracleUsdt;
    
    address public pancakeSwapV3Router;

    uint256 public usdcDm;
    uint256 public usdtDm;

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
        usdc = IERC20(params.usdc);
        usdt = IERC20(params.usdt);

        usdPlus = IUsdPlusToken(params.usdPlus);
        exchange = IExchange(params.exchange);

        oracleUsdc = IPriceFeed(params.oracleUsdc);
        oracleUsdt = IPriceFeed(params.oracleUsdt);

        pancakeSwapV3Router = params.pancakeSwapV3Router;

        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();
        usdtDm = 10 ** IERC20Metadata(params.usdt).decimals();

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        // swap usdc to usdt
        uint256 usdcBalance = usdc.balanceOf(address(this));
        PancakeSwapV3Library.singleSwap(
            pancakeSwapV3Router,
            address(usdc),
            address(usdt),
            100, // 0.01%
            address(this),
            usdcBalance,
            OvnMath.subBasisPoints(_oracleUsdcToUsdt(usdcBalance), swapSlippageBP)
        );

        // mint usdPlus
        uint256 usdtBalance = usdt.balanceOf(address(this));
        usdt.approve(address(exchange), usdtBalance);
        IExchange.MintParams memory params = IExchange.MintParams({
            asset: address(usdt),
            amount: usdtBalance,
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

        // add swap slippage
        uint256 usdPlusAmount = OvnMath.addBasisPoints(_oracleUsdcToUsdt(_amount) + 10, swapSlippageBP);
        if (usdPlusAmount >= usdPlusBalance) {
            usdPlusAmount = usdPlusBalance;
        }

        // redeem usdPlus
        exchange.redeem(address(usdt), usdPlusAmount);

        // swap usdt to usdc
        uint256 usdtBalance = usdt.balanceOf(address(this));
        PancakeSwapV3Library.singleSwap(
            pancakeSwapV3Router,
            address(usdt),
            address(usdc),
            100, // 0.01%
            address(this),
            usdtBalance,
            OvnMath.subBasisPoints(_oracleUsdtToUsdc(usdtBalance), swapSlippageBP)
        );

        return usdc.balanceOf(address(this));
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
        exchange.redeem(address(usdt), usdPlusBalance);

        // swap usdt to usdc
        uint256 usdtBalance = usdt.balanceOf(address(this));
        PancakeSwapV3Library.singleSwap(
            pancakeSwapV3Router,
            address(usdt),
            address(usdc),
            100, // 0.01%
            address(this),
            usdtBalance,
            OvnMath.subBasisPoints(_oracleUsdtToUsdc(usdtBalance), swapSlippageBP)
        );

        return usdc.balanceOf(address(this));
    }

    function _claimRewards(address _to) internal override returns (uint256) {
        return 0;
    }

    function netAssetValue() external view override returns (uint256) {
        uint256 balance = usdt.balanceOf(address(this)) + usdPlus.balanceOf(address(this));
        return usdc.balanceOf(address(this)) + _oracleUsdtToUsdc(balance);
    }

    function liquidationValue() external view override returns (uint256) {
        uint256 balance = usdt.balanceOf(address(this)) + usdPlus.balanceOf(address(this));
        return usdc.balanceOf(address(this)) + OvnMath.subBasisPoints(_oracleUsdtToUsdc(balance), swapSlippageBP);
    }

    function _oracleUsdcToUsdt(uint256 usdcAmount) internal view returns (uint256) {
        uint256 priceUsdc = uint256(oracleUsdc.latestAnswer());
        uint256 priceUsdt = uint256(oracleUsdt.latestAnswer());
        return ChainlinkLibrary.convertTokenToToken(usdcAmount, usdcDm, usdtDm, priceUsdc, priceUsdt);
    }

    function _oracleUsdtToUsdc(uint256 usdtAmount) internal view returns (uint256) {
        uint256 priceUsdc = uint256(oracleUsdc.latestAnswer());
        uint256 priceUsdt = uint256(oracleUsdt.latestAnswer());
        return ChainlinkLibrary.convertTokenToToken(usdtAmount, usdtDm, usdcDm, priceUsdt, priceUsdc);
    }
}
