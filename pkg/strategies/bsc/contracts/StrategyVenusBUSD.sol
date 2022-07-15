// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "./connectors/venus/interfaces/VenusInterface.sol";

contract StrategyVenusBUSD is Strategy {

    IERC20 public usdcToken;

    VenusInterface public vBusdToken;


    // --- events

    event StrategyUpdatedTokens(address usdcToken);

    event StrategyUpdatedParams(address vBusdToken);


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setTokens(
        address _usdcToken
    ) external onlyAdmin {

        require(_usdcToken != address(0), "Zero address not allowed");

        usdcToken = IERC20(_usdcToken);

        emit StrategyUpdatedTokens(_usdcToken);
    }

    function setParams(
        address _vBusdToken
    ) external onlyAdmin {

        require(_vBusdToken != address(0), "Zero address not allowed");

        vBusdToken = VenusInterface(_vBusdToken);

        emit StrategyUpdatedParams(_vBusdToken);
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(usdcToken), "Some token not compatible");

        usdcToken.approve(address(vBusdToken), _amount);
        vBusdToken.mint(_amount);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        uint256 withdrawAmount = vBusdToken.redeemUnderlying(_amount);
        return withdrawAmount;
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        uint256 amount = vBusdToken.balanceOf(address(this));
        uint256 withdrawAmount = vBusdToken.redeem(amount);
        return withdrawAmount;
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        return vBusdToken.balanceOf(address(this)) * vBusdToken.exchangeRateStored() / 1e18;
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {
        return 0;
    }

}
