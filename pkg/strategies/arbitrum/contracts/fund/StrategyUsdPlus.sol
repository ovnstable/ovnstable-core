// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/interfaces/IExchange.sol";
import "@overnight-contracts/core/contracts/interfaces/IUsdPlusToken.sol";



contract StrategyUsdPlus is Strategy {

    // --- params

    IERC20 public usdcToken;
    IUsdPlusToken public usdPlus;
    IExchange public exchange;
    
    // --- events

    event StrategyUpdatedParams();

    // --- structs

    struct MintParams {
        address asset;  
        uint256 amount;  
        string referral; 
    }

    struct StrategyParams {
        address usdc;
        address usdPlus;
        address exchange;
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
        exchange = IExchange(params.exchange);
        usdPlus = IUsdPlusToken(params.usdPlus);

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(usdcToken), "Some token not compatible");

        usdcToken.approve(address(exchange), _amount);

        MintParams params;
        params.amount = _amount;
        params.asset = _asset;

        exchange.mint(params);        
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        exchange.redeem(_asset, _amount);
        
        return usdcToken.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        exchange.redeem(_asset, usdPlus.balanceOf(address(this)));

        return usdcToken.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return usdcToken.balanceOf(address(this)) + usdPlus.balanceOf(address(this));
    }

    function liquidationValue() external view override returns (uint256) {
        return usdcToken.balanceOf(address(this)) + usdPlus.balanceOf(address(this));
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {
        return 0;
    }
}
