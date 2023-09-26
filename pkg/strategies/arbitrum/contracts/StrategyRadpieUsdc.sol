// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Radpie.sol";

contract StrategyRadpieUsdc is Strategy {

    // --- structs

    struct StrategyParams {
        address usdc;
        address radpiePoolHelper;
        address radiantStaking;
    }

    // --- params

    IERC20 public usdc;
    IRadpiePoolHelper public radpiePoolHelper;
    IRadiantStaking public radiantStaking;

    // --- events

    event StrategyUpdatedParams();

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }

    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        usdc = IERC20(params.usdc);
        radpiePoolHelper = IRadpiePoolHelper(params.radpiePoolHelper);
        radiantStaking = IRadiantStaking(params.radiantStaking);

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        uint256 totalStaked = radpiePoolHelper.totalStaked(address(usdc));
        IRadiantStaking.Pool memory pool = radiantStaking.pools(address(usdc));

        require(totalStaked + _amount <= pool.maxCap, "Max cap reached");

        usdc.approve(address(radpiePoolHelper), _amount);
        radpiePoolHelper.depositAsset(address(usdc), _amount);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        // add 10 to unstake more than requested because of rounding
        IRadiantStaking.Pool memory pool = radiantStaking.pools(address(usdc));
        uint256 shares = _amount * 1e18 / IRadpieReceiptToken(pool.receiptToken).assetPerShare() + 10;
        radpiePoolHelper.withdrawAsset(address(usdc), shares);

        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        uint256 shares = radpiePoolHelper.balance(address(usdc), address(this));
        radpiePoolHelper.withdrawAsset(address(usdc), shares);

        return usdc.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        uint256 usdcBalance = usdc.balanceOf(address(this));

        uint256 shares = radpiePoolHelper.balance(address(usdc), address(this));
        if (shares > 0) {
            IRadiantStaking.Pool memory pool = radiantStaking.pools(address(usdc));
            usdcBalance += shares * IRadpieReceiptToken(pool.receiptToken).assetPerShare() / 1e18;
        }

        return usdcBalance;
    }

    function _claimRewards(address _to) internal override returns (uint256) {
        return 0;
    }
}
