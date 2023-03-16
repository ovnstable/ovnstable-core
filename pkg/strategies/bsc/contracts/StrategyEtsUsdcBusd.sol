// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/core/contracts/interfaces/IHedgeExchanger.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import '@overnight-contracts/connectors/contracts/stuff/Wombat.sol';


contract StrategyEtsUsdcBusd is Strategy {

    // --- params

    IERC20 public asset;
    IERC20 public rebaseToken;
    IHedgeExchanger public hedgeExchanger;

    IERC20 public busd;

    IWombatRouter public wombatRouter;
    address public wombatPool;

    IPriceFeed public oracleAsset;
    IPriceFeed public oracleBusd;

    uint256 public assetDm;
    uint256 public busdDm;


    // --- events

    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address asset;
        address busd;
        address rebaseToken;
        address hedgeExchanger;
        address wombatRouter;
        address wombatPool;
        address oracleAsset;
        address oracleBusd;
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
        busd = IERC20(params.busd);

        rebaseToken = IERC20(params.rebaseToken);
        hedgeExchanger = IHedgeExchanger(params.hedgeExchanger);

        wombatRouter = IWombatRouter(params.wombatRouter);
        wombatPool = params.wombatPool;

        oracleAsset = IPriceFeed(params.oracleAsset);
        oracleBusd = IPriceFeed(params.oracleBusd);

        assetDm = 10 ** IERC20Metadata(params.asset).decimals();
        busdDm = 10 ** IERC20Metadata(params.busd).decimals();

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(asset), "Some token not compatible");

        // swap asset to busd
        uint256 assetBalance = asset.balanceOf(address(this));
        uint256 busdBalanceOut = WombatLibrary.getAmountOut(
            wombatRouter,
            address(asset),
            address(busd),
            wombatPool,
            assetBalance
        );
        if (busdBalanceOut > 0) {
            WombatLibrary.swapExactTokensForTokens(
                wombatRouter,
                address(asset),
                address(busd),
                wombatPool,
                assetBalance,
                OvnMath.subBasisPoints(_oracleAssetToBusd(assetBalance), swapSlippageBP),
                address(this)
            );
        }

        // buy
        uint256 busdBalance = busd.balanceOf(address(this));
        busd.approve(address(hedgeExchanger), busdBalance);
        hedgeExchanger.buy(busdBalance, "");
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(asset), "Some token not compatible");

        // add for unstake more than requested
        uint256 rebaseTokenAmount = OvnMath.addBasisPoints(_oracleAssetToBusd(_amount), swapSlippageBP) + 1e13;
        uint256 rebaseTokenBalance = rebaseToken.balanceOf(address(this));
        if (rebaseTokenAmount > rebaseTokenBalance) {
            rebaseTokenAmount = rebaseTokenBalance;
        }

        // redeem
        rebaseToken.approve(address(hedgeExchanger), rebaseTokenAmount);
        hedgeExchanger.redeem(rebaseTokenAmount);

        // swap busd to asset
        uint256 busdBalance = busd.balanceOf(address(this));
        uint256 assetBalanceOut = WombatLibrary.getAmountOut(
            wombatRouter,
            address(busd),
            address(asset),
            wombatPool,
            busdBalance
        );
        if (assetBalanceOut > 0) {
            WombatLibrary.swapExactTokensForTokens(
                wombatRouter,
                address(busd),
                address(asset),
                wombatPool,
                busdBalance,
                OvnMath.subBasisPoints(_oracleBusdToAsset(busdBalance), swapSlippageBP),
                address(this)
            );
        }

        return asset.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(asset), "Some token not compatible");

        // redeem
        uint256 rebaseTokenBalance = rebaseToken.balanceOf(address(this));
        rebaseToken.approve(address(hedgeExchanger), rebaseTokenBalance);
        hedgeExchanger.redeem(rebaseTokenBalance);

        // swap busd to asset
        uint256 busdBalance = busd.balanceOf(address(this));
        uint256 assetBalanceOut = WombatLibrary.getAmountOut(
            wombatRouter,
            address(busd),
            address(asset),
            wombatPool,
            busdBalance
        );
        if (assetBalanceOut > 0) {
            WombatLibrary.swapExactTokensForTokens(
                wombatRouter,
                address(busd),
                address(asset),
                wombatPool,
                busdBalance,
                OvnMath.subBasisPoints(_oracleBusdToAsset(busdBalance), swapSlippageBP),
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
        uint256 busdBalance = busd.balanceOf(address(this)) + rebaseToken.balanceOf(address(this));

        if (busdBalance > 0) {
            if (nav) {
                assetBalance += _oracleBusdToAsset(busdBalance);
            } else {
                assetBalance += OvnMath.subBasisPoints(_oracleBusdToAsset(busdBalance), swapSlippageBP);
            }
        }

        return assetBalance;
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {
        return 0;
    }

    function _oracleBusdToAsset(uint256 busdAmount) internal view returns (uint256) {
        uint256 priceBusd = uint256(oracleBusd.latestAnswer());
        uint256 priceAsset = uint256(oracleAsset.latestAnswer());
        return ChainlinkLibrary.convertTokenToToken(busdAmount, busdDm, assetDm, priceBusd, priceAsset);
    }

    function _oracleAssetToBusd(uint256 assetAmount) internal view returns (uint256) {
        uint256 priceBusd = uint256(oracleBusd.latestAnswer());
        uint256 priceAsset = uint256(oracleAsset.latestAnswer());
        return ChainlinkLibrary.convertTokenToToken(assetAmount, assetDm, busdDm, priceAsset, priceBusd);
    }

}
