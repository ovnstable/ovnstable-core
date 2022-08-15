// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "../connectors/venus/interfaces/VenusInterface.sol";


contract StrategyVenusUsdc is Strategy {

    IERC20 public usdcToken;

    VenusInterface public vUsdcToken;


    // --- events

    event StrategyUpdatedTokens(address usdcToken);

    event StrategyUpdatedParams(address vUsdcToken);


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
        address _vUsdcToken
    ) external onlyAdmin {

        require(_vUsdcToken != address(0), "Zero address not allowed");

        vUsdcToken = VenusInterface(_vUsdcToken);

        emit StrategyUpdatedParams(_vUsdcToken);
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(usdcToken), "Some token not compatible");

        usdcToken.approve(address(vUsdcToken), _amount);
        vUsdcToken.mint(_amount);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        vUsdcToken.redeemUnderlying(_amount);

        return usdcToken.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        vUsdcToken.redeem(vUsdcToken.balanceOf(address(this)));

        return usdcToken.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        return vUsdcToken.balanceOf(address(this)) * vUsdcToken.exchangeRateStored() / 1e18;
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {
        return 0;
    }

}
