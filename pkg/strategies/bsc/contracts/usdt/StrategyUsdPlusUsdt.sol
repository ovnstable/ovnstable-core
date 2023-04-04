// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/core/contracts/interfaces/IUsdPlusToken.sol";
import "@overnight-contracts/core/contracts/interfaces/IExchange.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/Wombat.sol";


contract StrategyUsdPlusUsdt is Strategy {

    // --- structs

    struct StrategyParams {
        address usdt;
        address usdc;
        address usdPlus;
        address exchange;
        address oracleUsdt;
        address oracleUsdc;
        address wombatRouter;
        address wombatPool;
    }

    // --- params

    IERC20 public usdt;
    IERC20 public usdc;
    
    IUsdPlusToken public usdPlus;
    IExchange public exchange;
    
    IPriceFeed public oracleUsdt;
    IPriceFeed public oracleUsdc;
    
    IWombatRouter public wombatRouter;
    address public wombatPool;
    
    uint256 public usdtDm;
    uint256 public usdcDm;

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
        usdt = IERC20(params.usdt);
        usdc = IERC20(params.usdc);

        usdPlus = IUsdPlusToken(params.usdPlus);
        exchange = IExchange(params.exchange);

        oracleUsdt = IPriceFeed(params.oracleUsdt);
        oracleUsdc = IPriceFeed(params.oracleUsdc);

        wombatRouter = IWombatRouter(params.wombatRouter);
        wombatPool = params.wombatPool;

        usdtDm = 10 ** IERC20Metadata(params.usdt).decimals();
        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(usdt), "Some token not compatible");

        // swap usdt to usdc
        uint256 usdtBalance = usdt.balanceOf(address(this));
        uint256 usdcBalanceOut = WombatLibrary.getAmountOut(
            wombatRouter,
            address(usdt),
            address(usdc),
            wombatPool,
            usdtBalance
        );
        if (usdcBalanceOut > 0) {
            WombatLibrary.swapExactTokensForTokens(
                wombatRouter,
                address(usdt),
                address(usdc),
                wombatPool,
                usdtBalance,
                OvnMath.subBasisPoints(_oracleUsdtToUsdc(usdtBalance), swapSlippageBP),
                address(this)
            );
        }

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

        require(_asset == address(usdt), "Some token not compatible");

        uint256 usdPlusBalance = usdPlus.balanceOf(address(this));
        if (usdPlusBalance == 0) {
            return 0;
        }

        // add swap slippage
        uint256 usdPlusAmount = OvnMath.addBasisPoints(_oracleUsdtToUsdc(_amount) / 1e12 + 10, swapSlippageBP);
        if (usdPlusAmount >= usdPlusBalance) {
            usdPlusAmount = usdPlusBalance;
        }

        // redeem usdPlus
        exchange.redeem(address(usdc), usdPlusAmount);

        // swap usdc to usdt
        uint256 usdcBalance = usdc.balanceOf(address(this));
        uint256 usdtBalanceOut = WombatLibrary.getAmountOut(
            wombatRouter,
            address(usdc),
            address(usdt),
            wombatPool,
            usdcBalance
        );
        if (usdtBalanceOut > 0) {
            WombatLibrary.swapExactTokensForTokens(
                wombatRouter,
                address(usdc),
                address(usdt),
                wombatPool,
                usdcBalance,
                OvnMath.subBasisPoints(_oracleUsdcToUsdt(usdcBalance), swapSlippageBP),
                address(this)
            );
        }

        return usdt.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdt), "Some token not compatible");

        uint256 usdPlusBalance = usdPlus.balanceOf(address(this));
        if (usdPlusBalance == 0) {
            return 0;
        }

        // redeem usdPlus
        exchange.redeem(address(usdc), usdPlusBalance);

        // swap usdc to usdt
        uint256 usdcBalance = usdc.balanceOf(address(this));
        uint256 usdtBalanceOut = WombatLibrary.getAmountOut(
            wombatRouter,
            address(usdc),
            address(usdt),
            wombatPool,
            usdcBalance
        );
        if (usdtBalanceOut > 0) {
            WombatLibrary.swapExactTokensForTokens(
                wombatRouter,
                address(usdc),
                address(usdt),
                wombatPool,
                usdcBalance,
                OvnMath.subBasisPoints(_oracleUsdcToUsdt(usdcBalance), swapSlippageBP),
                address(this)
            );
        }

        return usdt.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        uint256 usdPlusBalance = usdPlus.balanceOf(address(this));
        return usdt.balanceOf(address(this)) + _oracleUsdcToUsdt(usdPlusBalance * 1e12);
    }

    function liquidationValue() external view override returns (uint256) {
        uint256 usdPlusBalance = usdPlus.balanceOf(address(this));
        return usdt.balanceOf(address(this)) + OvnMath.subBasisPoints(_oracleUsdcToUsdt(usdPlusBalance * 1e12), swapSlippageBP);
    }

    function _claimRewards(address _to) internal override returns (uint256) {
        return 0;
    }

    function _oracleUsdtToUsdc(uint256 usdtAmount) internal view returns (uint256) {
        uint256 priceUsdt = uint256(oracleUsdt.latestAnswer());
        uint256 priceUsdc = uint256(oracleUsdc.latestAnswer());
        return ChainlinkLibrary.convertTokenToToken(usdtAmount, usdtDm, usdcDm, priceUsdt, priceUsdc);
    }

    function _oracleUsdcToUsdt(uint256 usdcAmount) internal view returns (uint256) {
        uint256 priceUsdt = uint256(oracleUsdt.latestAnswer());
        uint256 priceUsdc = uint256(oracleUsdc.latestAnswer());
        return ChainlinkLibrary.convertTokenToToken(usdcAmount, usdcDm, usdtDm, priceUsdc, priceUsdt);
    }
}
