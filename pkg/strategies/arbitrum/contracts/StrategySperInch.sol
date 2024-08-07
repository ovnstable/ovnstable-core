// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/core/contracts/interfaces/ISperStrategy.sol";
import "@overnight-contracts/core/contracts/interfaces/IHedgeExchanger.sol";
import "@overnight-contracts/core/contracts/interfaces/IInchSwapper.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";


contract StrategySperInch is Strategy {

    // --- params

    ISperStrategy public sper;

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
        address sper;
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
    }


    // --- setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        require(params.sper != address(0), "rebaseToken is zero");
        require(params.asset != address(0), "asset is zero");
        require(params.underlyingAsset != address(0), "underlyingAsset is zero");
        require(params.oracleAsset != address(0), "oracleAsset is zero");
        require(params.oracleUnderlyingAsset != address(0), "oracleUnderlyingAsset is zero");
        require(params.inchSwapper != address(0), "inchSwapper is zero");

        sper = ISperStrategy(params.sper);

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
        if (address(underlyingAsset) == address(asset)) {
            asset.transfer(address(sper), _amount);
            sper.stake(address(asset), _amount);
            return;
        }
        asset.approve(address(inchSwapper), _amount);
        uint256 amountOutMin = OvnMath.subBasisPoints(_oracleAssetToUnderlying(_amount), swapSlippageBP);
        inchSwapper.swap(address(this), address(asset), address(underlyingAsset), _amount, amountOutMin);
        // mint by underlying
        uint256 underlyingBalance = underlyingAsset.balanceOf(address(this));
        underlyingAsset.transfer(address(sper), underlyingBalance);
        sper.stake(address(underlyingAsset), underlyingBalance);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        
        if (address(underlyingAsset) == address(asset)) {
            sper.unstake(address(asset), _amount, address(this), false);
            return asset.balanceOf(address(this));
        }

        // convert asset to underlying with some addition
        uint256 amountToRedeem = OvnMath.addBasisPoints(_oracleAssetToUnderlying(_amount), swapSlippageBP);

        // redeem asset
        sper.unstake(address(underlyingAsset), amountToRedeem, address(this), false);

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

                
        if (address(underlyingAsset) == address(asset)) {
            sper.unstake(address(asset), sper.netAssetValue(), address(this), true);
            return asset.balanceOf(address(this));
        }

        // get all underlying by full rebase
        sper.unstake(address(underlyingAsset), sper.netAssetValue(), address(this), true);


        // swap underlying to asset
        uint256 underlyingBalance = underlyingAsset.balanceOf(address(this));
        underlyingAsset.approve(address(inchSwapper), underlyingBalance);
        uint256 amountOutMin = OvnMath.subBasisPoints(_oracleUnderlyingToAsset(underlyingBalance), swapSlippageBP);
        inchSwapper.swap(address(this), address(underlyingAsset), address(asset), underlyingBalance, amountOutMin);

        return asset.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue(sper.netAssetValue());
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue(sper.liquidationValue());
    }

    function _totalValue(uint256 sperBalance) internal view returns (uint256) {
        uint256 convertedBalance = _oracleUnderlyingToAsset(sperBalance);
        return asset.balanceOf(address(this)) + convertedBalance;
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {
        return sper.claimRewards(_beneficiary);
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
