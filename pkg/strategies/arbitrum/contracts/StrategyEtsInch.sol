// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/core/contracts/interfaces/IHedgeExchanger.sol";
import "@overnight-contracts/core/contracts/interfaces/IInchSwapper.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";


contract StrategyEtsInch is Strategy {

    // --- params

    IERC20 public rebaseToken;
    IHedgeExchanger public hedgeExchanger;

    IERC20 public asset;
    IERC20 public underlyingAsset;
    IInchSwapper public inchSwapper;

    IPriceFeed public oracleAsset;
    IPriceFeed public oracleUnderlyingAsset;
    uint256 public assetDm;
    uint256 public underlyingAssetDm;



    // --- events
    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address rebaseToken;
        address hedgeExchanger;
        address asset;
        address underlyingAsset;
        address oracleAsset;
        address oracleUnderlyingAsset;
        address inchSwapper;
    }


    // --- constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
        swapSlippageBP = 40;
    }


    // --- setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        
        require(params.rebaseToken != address(0), "SetParams: rebase token could not be zero address");
        require(params.hedgeExchanger != address(0), "SetParams: hedge exchanger could not be zero address");
        require(params.asset != address(0), "SetParams: asset could not be zero address");
        require(params.underlyingAsset != address(0), "SetParams: underlying asset could not be zero address");
        require(params.oracleAsset != address(0), "SetParams: oracle asset could not be zero address");
        require(params.oracleUnderlyingAsset != address(0), "SetParams: oracle underlying asset could not be zero address");
        require(params.inchSwapper != address(0), "SetParams: inch swapper could not be zero address");

        rebaseToken = IERC20(params.rebaseToken);
        hedgeExchanger = IHedgeExchanger(params.hedgeExchanger);
        
        asset = IERC20(params.asset);
        underlyingAsset = IERC20(params.underlyingAsset);
        inchSwapper = IInchSwapper(params.inchSwapper);

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
        // swap asset to underlying to stake
        asset.approve(address(inchSwapper), _amount);
        uint256 amountOutMin = OvnMath.subBasisPoints(_oracleAssetToUnderlying(_amount), swapSlippageBP);
        inchSwapper.swap(address(this), address(asset), address(underlyingAsset), _amount, amountOutMin);
        // mint by underlying
        uint256 underlyingBalance = underlyingAsset.balanceOf(address(this));
        underlyingAsset.approve(address(hedgeExchanger), underlyingBalance);
        hedgeExchanger.buy(underlyingBalance, "");
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        // convert asset to underlying with some addition
        uint256 amountToRedeem = OvnMath.addBasisPoints(_oracleAssetToUnderlying(_amount), stakeSlippageBP);

        // redeem asset
        rebaseToken.approve(address(hedgeExchanger), amountToRedeem);
        hedgeExchanger.redeem(amountToRedeem);

        // swap underlying to asset
        uint256 underlyingBalance = underlyingAsset.balanceOf(address(this));
        underlyingAsset.approve(address(inchSwapper), underlyingBalance);
        uint256 amountOutMin = OvnMath.subBasisPoints(_oracleUnderlyingToAsset(underlyingBalance), swapSlippageBP);
        inchSwapper.swap(address(this), address(underlyingAsset), address(asset), underlyingBalance, amountOutMin);

        return asset.balanceOf(address(this));
    }

    // get all underlying, convert to asset
    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        // get all underlying by full rebase
        uint256 rebaseTokenAmount = rebaseToken.balanceOf(address(this));
        rebaseToken.approve(address(hedgeExchanger), rebaseTokenAmount);
        hedgeExchanger.redeem(rebaseTokenAmount);

        // swap underlying to asset
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
        uint256 rebaseBalance = rebaseToken.balanceOf(address(this));
        uint256 convertedBalance = _oracleUnderlyingToAsset(rebaseBalance);
        return asset.balanceOf(address(this)) + convertedBalance;
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
