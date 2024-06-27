// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;


import "@overnight-contracts/connectors/contracts/stuff/Morpho.sol";



contract StrategyMorphoDirect is Strategy {
    
    // --- params

    IERC20 public usdcToken;
    IMorpho public morpho;
    Id public marketId;
    
    // --- events

    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address usdc;
        address morpho;
        Id marketId;
    }


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        usdcToken = IERC20(params.usdc);
        morpho = IMorpho(params.morpho);
        marketId = params.marketId;
        
        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(usdcToken), "Some token not compatible");

        MarketParams memory marketParams = morpho.idToMarketParams(marketId); // mb do it in strategy setting
        
        usdcToken.approve(address(morpho), _amount);

        morpho.supply(marketParams, _amount, 0, address(this), "");
        
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        MarketParams memory marketParams = morpho.idToMarketParams(marketId); // mb do it in strategy setting
        morpho.withdraw(marketParams, _amount, 0, address(this), address(this));
        
        return usdcToken.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        MarketParams memory marketParams = morpho.idToMarketParams(marketId); // mb do it in strategy setting
        // (uint256 supplyShares,,) = morpho.position(marketId, address(this));
        morpho.withdraw(marketParams, 0, morpho.position(marketId, address(this)).supplyShares, address(this), address(this));

        return usdcToken.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return usdcToken.balanceOf(address(this)) + SharesMathLib.toAssetsDown(morpho.position(marketId, address(this)).supplyShares, morpho.market(marketId).totalSupplyAssets, morpho.market(marketId).totalSupplyShares);
    }

    function liquidationValue() external view override returns (uint256) {
        return usdcToken.balanceOf(address(this)) + SharesMathLib.toAssetsDown(morpho.position(marketId, address(this)).supplyShares, morpho.market(marketId).totalSupplyAssets, morpho.market(marketId).totalSupplyShares);
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {
        return 0;
    }
}
