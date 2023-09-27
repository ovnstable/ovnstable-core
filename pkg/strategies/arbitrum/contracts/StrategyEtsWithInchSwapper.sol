// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/core/contracts/interfaces/IHedgeExchanger.sol";
import "@overnight-contracts/core/contracts/interfaces/IInchSwapper.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";


contract StrategyEtsWithInch is Strategy {

    // --- params

    IERC20 public asset;
    IERC20 public underlyingAsset;
    IInchSwapper public inchSwapper;
    IPriceFeed public oracleAsset;
    IPriceFeed public oracleUnderlyingAsset;
    uint256 public assetDm;
    uint256 public underlyingAssetDm;

    IERC20 public rebaseToken;
    IHedgeExchanger public hedgeExchanger;

    uint256 swapSlippageBp;


    // --- events
    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address asset;
        address underlyingAsset;
        address oracleAsset;
        address oracleUnderlyingAsset;
        address inchSwapper;
        address rebaseToken;
        address hedgeExchanger;
    }


    // --- constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
        swapSlippageBp = 40;
    }


    // --- setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        asset = IERC20(params.asset);
        underlyingAsset = IERC20(params.underlyingAsset);
        inchSwapper = IInchSwapper(params.inchSwapper);
        rebaseToken = IERC20(params.rebaseToken);
        hedgeExchanger = IHedgeExchanger(params.hedgeExchanger);
        oracleAsset = IPriceFeed(params.oracleAsset);
        oracleUnderlyingAsset = IPriceFeed(params.oracleUnderlyingAsset);

        assetDm = 10 ** IERC20Metadata(params.asset).decimals();
        underlyingAssetDm = 10 ** IERC20Metadata(params.underlyingAsset).decimals();

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
        asset.approve(address(inchSwapper), _amount);
        uint256 underlyingBalanceWas = underlyingAsset.balanceOf(address(this));
        uint256 amountOutMin = OvnMath.subBasisPoints(_oracleAssetToUnderlying(_amount), swapSlippageBP);
        inchSwapper.swap(address(this), address(asset), address(underlyingAsset), _amount, amountOutMin);
        uint256 underlyingBalanceNow = underlyingAsset.balanceOf(address(this));
        underlyingAsset.approve(address(hedgeExchanger), underlyingBalanceNow - underlyingBalanceWas);
        hedgeExchanger.buy(underlyingBalanceNow - underlyingBalanceWas, "");
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        rebaseToken.approve(address(hedgeExchanger), _amount);
        hedgeExchanger.redeem(_amount);
        uint256 underlyingBalance = underlyingAsset.balanceOf(address(this));
        underlyingAsset.approve(address(inchSwapper), underlyingBalance);
        uint256 amountOutMin = OvnMath.subBasisPoints(_oracleUnderlyingToAsset(underlyingBalance), swapSlippageBP);
        inchSwapper.swap(address(this), address(underlyingAsset), address(asset), underlyingBalance, amountOutMin);
        return asset.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        uint256 rebaseTokenAmount = rebaseToken.balanceOf(address(this));
        rebaseToken.approve(address(hedgeExchanger), rebaseTokenAmount);
        hedgeExchanger.redeem(rebaseTokenAmount);
        uint256 underlyingBalance = underlyingAsset.balanceOf(address(this));
        underlyingAsset.approve(address(inchSwapper), underlyingBalance);
        uint256 amountOutMin = OvnMath.subBasisPoints(_oracleUnderlyingToAsset(underlyingBalance), swapSlippageBP);
        inchSwapper.swap(address(this), address(underlyingAsset), address(asset), underlyingBalance, amountOutMin);
        return asset.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        return asset.balanceOf(address(this)) + rebaseToken.balanceOf(address(this));
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {
        return 0;
    }

    function _oracleAssetToUnderlying(uint256 assetAmount) internal view returns (uint256) {
        uint256 priceAsset = ChainlinkLibrary.getPrice(oracleAsset);
        uint256 priceUnderlyingAsset = ChainlinkLibrary.getPrice(oracleUnderlyingAsset);
        return ChainlinkLibrary.convertTokenToToken(assetAmount, assetDm, underlyingAssetDm, priceAsset, priceUnderlyingAsset);
    }

    function _oracleUnderlyingToAsset(uint256 underlyingAssetAmount) internal view returns (uint256) {
        uint256 priceAsset = ChainlinkLibrary.getPrice(oracleAsset);
        uint256 priceUnderlyingAsset = ChainlinkLibrary.getPrice(oracleUnderlyingAsset);
        return ChainlinkLibrary.convertTokenToToken(underlyingAssetAmount, underlyingAssetDm, assetDm, priceUnderlyingAsset, priceAsset);
    }

}
