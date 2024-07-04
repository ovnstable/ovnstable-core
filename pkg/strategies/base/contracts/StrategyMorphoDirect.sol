// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/connectors/contracts/stuff/Morpho.sol";


contract StrategyMorphoDirect is Strategy {
    using MathLib for uint128;
    using MathLib for uint256;
    using UtilsLib for uint256;
    using SharesMathLib for uint256;
    
    // --- params

    IERC20 public usdcToken;
    IMorpho public morpho;
    Id public marketId;
    MarketParams public marketParams;

    address treasury;
    uint256 fee; // in basis points
    uint256 balance;
    uint256 limit; // in basis points

    
    // --- events

    event StrategyUpdatedParams();
    event StrategyUpdatedFee();
    event StrategyUpdatedLimit();
    event StrategyUpdatedTreasury();

    
    // --- structs

    struct StrategyParams {
        address usdc;
        address morpho;
        Id marketId;
        MarketParams marketParams;
        address treasury;
        uint256 fee;
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
        marketParams = params.marketParams;
        treasury = params.treasury;
        fee = params.fee;

        balance = 0;
        limit = 0; 
        
        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(usdcToken), "Some token not compatible");

        usdcToken.approve(address(morpho), _amount);

        morpho.supply(marketParams, _amount, 0, address(this), "");
        
        balance += _amount;
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");        

        morpho.withdraw(marketParams, _amount, 0, address(this), address(this));

        balance -= _amount;

        return usdcToken.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        morpho.withdraw(marketParams, 0, morpho.position(marketId, address(this)).supplyShares, address(this), address(this));

        balance = 0;

        return usdcToken.balanceOf(address(this));
    }

    function currentDepositValue() internal view returns (uint256) {
        Market memory market = morpho.market(marketId);
        Position memory position = morpho.position(marketId, address(this));

        uint256 elapsed = block.timestamp - market.lastUpdate;
        if (elapsed == 0) return SharesMathLib.toAssetsDown(position.supplyShares, morpho.market(marketId).totalSupplyAssets, morpho.market(marketId).totalSupplyShares);

        if (marketParams.irm != address(0)) {
            uint256 borrowRate = IIrm(marketParams.irm).borrowRateView(marketParams, market);
            uint256 interest = market.totalBorrowAssets.wMulDown(borrowRate.wTaylorCompounded(elapsed));
            market.totalBorrowAssets += interest.toUint128();
            market.totalSupplyAssets += interest.toUint128();

            uint256 feeShares;
            if (market.fee != 0) {
                uint256 feeAmount = interest.wMulDown(market.fee);
                // The fee amount is subtracted from the total supply in this calculation to compensate for the fact
                // that total supply is already increased by the full interest (including the fee amount).
                feeShares =
                    feeAmount.toSharesDown(market.totalSupplyAssets - feeAmount, market.totalSupplyShares);
                position.supplyShares += feeShares;
                market.totalSupplyShares += feeShares.toUint128();
            }
        }

        return SharesMathLib.toAssetsDown(position.supplyShares, market.totalSupplyAssets, market.totalSupplyShares);
    }

    function netAssetValue() external view override returns (uint256) {
        return usdcToken.balanceOf(address(this)) + currentDepositValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return usdcToken.balanceOf(address(this)) + currentDepositValue();
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {
        uint256 curNetAssetValue = usdcToken.balanceOf(address(this)) + currentDepositValue();
        uint256 revenue = curNetAssetValue > balance ? (curNetAssetValue - balance) * fee / 10000 : 0;

        
        if(revenue > 0 && revenue * 10000 < curNetAssetValue * limit) {   
            morpho.withdraw(marketParams, revenue, 0, address(this), address(this));
            usdcToken.transfer(treasury, revenue);
            balance -= revenue;
        }

        return revenue;
    }

    function setFee(uint256 _fee) onlyPortfolioAgent public {
        fee = _fee;

        emit StrategyUpdatedFee();
    }

    function setTreasury(address _treasury) onlyPortfolioAgent public {
        treasury = _treasury;

        emit StrategyUpdatedTreasury();
    }

    function setLimit(uint256 _limit) onlyPortfolioAgent public {
        limit = _limit;

        emit StrategyUpdatedLimit();
    }
}