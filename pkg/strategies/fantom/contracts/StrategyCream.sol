// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./core/Strategy.sol";
import "./connectors/cream/interfaces/ICErc20Delegator.sol";

contract StrategyCream is Strategy {

    IERC20 public usdcToken;

    uint256 constant public creamExchangeRateScaling = 10 ** 18;

    ICErc20Delegator public cErc20Delegator;


    // --- events

    event StrategyAaveUpdatedTokens(address usdcToken, address aUsdcToken);

    event StrategyAaveUpdatedParams(address aaveProvider);


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setTokens(
        address _usdcToken,
        address _crUsdcToken
    ) external onlyAdmin {

        require(_usdcToken != address(0), "Zero address not allowed");
        require(_crUsdcToken != address(0), "Zero address not allowed");

        usdcToken = IERC20(_usdcToken);

        emit StrategyAaveUpdatedTokens(_usdcToken, _crUsdcToken);
    }

    function setParams(
        address _cErc20Delegator
    ) external onlyAdmin {

        require(_cErc20Delegator != address(0), "Zero address not allowed");

        cErc20Delegator = ICErc20Delegator(_cErc20Delegator);

        emit StrategyAaveUpdatedParams(_cErc20Delegator);
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(usdcToken), "Some token not compatible");

        usdcToken.approve(address(cErc20Delegator), _amount);
        cErc20Delegator.mint(_amount);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        cErc20Delegator.redeemUnderlying(_amount);
        return usdcToken.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        uint256 _amount = cErc20Delegator.balanceOf(address(this));
        cErc20Delegator.redeem(_amount);
        return usdcToken.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        uint256 balance = cErc20Delegator.balanceOf(address(this));
        uint256 exchange = cErc20Delegator.exchangeRateStored();
        return balance * exchange / creamExchangeRateScaling;
    }

    function liquidationValue() external view override returns (uint256) {
        uint256 balance = cErc20Delegator.balanceOf(address(this));
        uint256 exchange = cErc20Delegator.exchangeRateStored();
        return balance * exchange / creamExchangeRateScaling;
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {
        return 0;
    }

}
