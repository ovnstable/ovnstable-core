// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "../connectors/venus/interfaces/VenusInterface.sol";


contract StrategyVenusUsdt is Strategy {

    IERC20 public usdtToken;

    VenusInterface public vUsdtToken;


    // --- events

    event StrategyUpdatedTokens(address usdtToken);

    event StrategyUpdatedParams(address vUsdtToken);


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setTokens(
        address _usdtToken
    ) external onlyAdmin {

        require(_usdtToken != address(0), "Zero address not allowed");

        usdtToken = IERC20(_usdtToken);

        emit StrategyUpdatedTokens(_usdtToken);
    }

    function setParams(
        address _vUsdtToken
    ) external onlyAdmin {

        require(_vUsdtToken != address(0), "Zero address not allowed");

        vUsdtToken = VenusInterface(_vUsdtToken);

        emit StrategyUpdatedParams(_vUsdtToken);
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(usdtToken), "Some token not compatible");

        usdtToken.approve(address(vUsdtToken), _amount);
        vUsdtToken.mint(_amount);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdtToken), "Some token not compatible");

        vUsdtToken.redeemUnderlying(_amount);

        return usdtToken.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdtToken), "Some token not compatible");

        vUsdtToken.redeem(vUsdtToken.balanceOf(address(this)));

        return usdtToken.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        return vUsdtToken.balanceOf(address(this)) * vUsdtToken.exchangeRateStored() / 1e18;
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {
        return 0;
    }

}
