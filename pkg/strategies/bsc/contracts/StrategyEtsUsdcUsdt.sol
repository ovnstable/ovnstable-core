// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/core/contracts/interfaces/IHedgeExchanger.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import '@overnight-contracts/connectors/contracts/stuff/Wombat.sol';


contract StrategyEtsUsdcUsdt is Strategy {

    // --- params

    IERC20 public asset;
    IERC20 public rebaseToken;
    IHedgeExchanger public hedgeExchanger;

    IERC20 public busd; // not used

    IWombatRouter public wombatRouter;
    address public wombatPool;

    IPriceFeed public oracleAsset;
    IPriceFeed public oracleBusd; // not used

    uint256 public assetDm;
    uint256 public busdDm; // not used

    IERC20 public usdt;
    uint256 public usdtDm;
    IPriceFeed public oracleUsdt;


    // --- events

    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address asset;
        address usdt;
        address rebaseToken;
        address hedgeExchanger;
        address wombatRouter;
        address wombatPool;
        address oracleAsset;
        address oracleUsdt;
    }


    // --- constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        asset = IERC20(params.asset);
        usdt = IERC20(params.usdt);

        rebaseToken = IERC20(params.rebaseToken);
        hedgeExchanger = IHedgeExchanger(params.hedgeExchanger);

        wombatRouter = IWombatRouter(params.wombatRouter);
        wombatPool = params.wombatPool;

        oracleAsset = IPriceFeed(params.oracleAsset);
        oracleUsdt = IPriceFeed(params.oracleUsdt);

        assetDm = 10 ** IERC20Metadata(params.asset).decimals();
        usdtDm = 10 ** IERC20Metadata(params.usdt).decimals();

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        // swap asset to usdt
        uint256 assetBalance = asset.balanceOf(address(this));
        uint256 usdtBalanceOut = WombatLibrary.getAmountOut(
            wombatRouter,
            address(asset),
            address(usdt),
            wombatPool,
            assetBalance
        );
        if (usdtBalanceOut > 0) {
            WombatLibrary.swapExactTokensForTokens(
                wombatRouter,
                address(asset),
                address(usdt),
                wombatPool,
                assetBalance,
                OvnMath.subBasisPoints(_oracleAssetToUsdt(assetBalance), swapSlippageBP),
                address(this)
            );
        }

        // buy
        uint256 usdtBalance = usdt.balanceOf(address(this));
        usdt.approve(address(hedgeExchanger), usdtBalance);
        hedgeExchanger.buy(usdtBalance, "");
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        // add for unstake more than requested
        uint256 rebaseTokenAmount = OvnMath.addBasisPoints(_oracleAssetToUsdt(_amount), swapSlippageBP) + 1e13;
        uint256 rebaseTokenBalance = rebaseToken.balanceOf(address(this));
        if (rebaseTokenAmount > rebaseTokenBalance) {
            rebaseTokenAmount = rebaseTokenBalance;
        }

        // redeem
        rebaseToken.approve(address(hedgeExchanger), rebaseTokenAmount);
        hedgeExchanger.redeem(rebaseTokenAmount);

        // swap usdt to asset
        uint256 usdtBalance = usdt.balanceOf(address(this));
        uint256 assetBalanceOut = WombatLibrary.getAmountOut(
            wombatRouter,
            address(usdt),
            address(asset),
            wombatPool,
            usdtBalance
        );
        if (assetBalanceOut > 0) {
            WombatLibrary.swapExactTokensForTokens(
                wombatRouter,
                address(usdt),
                address(asset),
                wombatPool,
                usdtBalance,
                OvnMath.subBasisPoints(_oracleUsdtToAsset(usdtBalance), swapSlippageBP),
                address(this)
            );
        }

        return asset.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        // redeem
        uint256 rebaseTokenBalance = rebaseToken.balanceOf(address(this));
        rebaseToken.approve(address(hedgeExchanger), rebaseTokenBalance);
        hedgeExchanger.redeem(rebaseTokenBalance);

        // swap usdt to asset
        uint256 usdtBalance = usdt.balanceOf(address(this));
        uint256 assetBalanceOut = WombatLibrary.getAmountOut(
            wombatRouter,
            address(usdt),
            address(asset),
            wombatPool,
            usdtBalance
        );
        if (assetBalanceOut > 0) {
            WombatLibrary.swapExactTokensForTokens(
                wombatRouter,
                address(usdt),
                address(asset),
                wombatPool,
                usdtBalance,
                OvnMath.subBasisPoints(_oracleUsdtToAsset(usdtBalance), swapSlippageBP),
                address(this)
            );
        }

        return asset.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue(true);
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue(false);
    }

    function _totalValue(bool nav) internal view returns (uint256) {
        uint256 assetBalance = asset.balanceOf(address(this));
        uint256 usdtBalance = usdt.balanceOf(address(this)) + rebaseToken.balanceOf(address(this));

        if (usdtBalance > 0) {
            if (nav) {
                assetBalance += _oracleUsdtToAsset(usdtBalance);
            } else {
                assetBalance += OvnMath.subBasisPoints(_oracleUsdtToAsset(usdtBalance), swapSlippageBP);
            }
        }

        return assetBalance;
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {
        return 0;
    }

    function _oracleUsdtToAsset(uint256 usdtAmount) internal view returns (uint256) {
        uint256 priceUsdt = uint256(oracleUsdt.latestAnswer());
        uint256 priceAsset = uint256(oracleAsset.latestAnswer());
        return ChainlinkLibrary.convertTokenToToken(usdtAmount, usdtDm, assetDm, priceUsdt, priceAsset);
    }

    function _oracleAssetToUsdt(uint256 assetAmount) internal view returns (uint256) {
        uint256 priceUsdt = uint256(oracleUsdt.latestAnswer());
        uint256 priceAsset = uint256(oracleAsset.latestAnswer());
        return ChainlinkLibrary.convertTokenToToken(assetAmount, assetDm, usdtDm, priceAsset, priceUsdt);
    }

}
