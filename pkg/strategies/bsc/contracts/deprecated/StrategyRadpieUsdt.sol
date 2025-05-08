// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Radpie.sol";
import "@overnight-contracts/connectors/contracts/stuff/PancakeV3.sol";

contract StrategyRadpieUsdt is Strategy {

    // --- structs

    struct StrategyParams {
        address usdt;
        address esRdnt;
        address rdnt;
        address wBnb;
        address radpiePoolHelper;
        address radiantStaking;
        address radiantRewardManager;
        address pancakeSwapV3Router;
    }

    // --- params

    IERC20 public usdt;
    IERC20 public esRdnt;
    IERC20 public rdnt;
    IERC20 public wBnb;
    IRadpiePoolHelper public radpiePoolHelper;
    IRadiantStaking public radiantStaking;
    IRDNTRewardManager public radiantRewardManager;
    address public pancakeSwapV3Router;

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
        require(params.usdt != address(0), 'usdt is empty');
        require(params.esRdnt != address(0), 'esRdnt is empty');
        require(params.rdnt != address(0), 'rdnt is empty');
        require(params.wBnb != address(0), 'wBnb is empty');
        require(params.radpiePoolHelper != address(0), 'radpiePoolHelper is empty');
        require(params.radiantStaking != address(0), 'radiantStaking is empty');
        require(params.radiantRewardManager != address(0), 'radiantRewardManager is empty');
        require(params.pancakeSwapV3Router != address(0), 'pancakeSwapV3Router is empty');

        usdt = IERC20(params.usdt);
        esRdnt = IERC20(params.esRdnt);
        rdnt = IERC20(params.rdnt);
        wBnb = IERC20(params.wBnb);
        radpiePoolHelper = IRadpiePoolHelper(params.radpiePoolHelper);
        radiantStaking = IRadiantStaking(params.radiantStaking);
        radiantRewardManager = IRDNTRewardManager(params.radiantRewardManager);
        pancakeSwapV3Router = params.pancakeSwapV3Router;

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        uint256 totalStaked = radpiePoolHelper.totalStaked(address(usdt));
        IRadiantStaking.Pool memory pool = radiantStaking.pools(address(usdt));

        require(totalStaked + _amount <= pool.maxCap, "Max cap reached");

        usdt.approve(address(radpiePoolHelper), _amount);
        radpiePoolHelper.depositAsset(address(usdt), _amount);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        // add 10 to unstake more than requested because of rounding
        IRadiantStaking.Pool memory pool = radiantStaking.pools(address(usdt));
        uint256 shares = _amount * 1e18 / IRadpieReceiptToken(pool.receiptToken).assetPerShare() + 10;
        radpiePoolHelper.withdrawAsset(address(usdt), shares);

        return usdt.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        uint256 shares = radpiePoolHelper.balance(address(usdt), address(this));
        radpiePoolHelper.withdrawAsset(address(usdt), shares);

        return usdt.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        uint256 usdtBalance = usdt.balanceOf(address(this));

        uint256 shares = radpiePoolHelper.balance(address(usdt), address(this));
        if (shares > 0) {
            IRadiantStaking.Pool memory pool = radiantStaking.pools(address(usdt));
            usdtBalance += shares * IRadpieReceiptToken(pool.receiptToken).assetPerShare() / 1e18;
        }

        return usdtBalance;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        uint256 entitledRDNT = radiantRewardManager.entitledRDNT(address(this));
        if (entitledRDNT > 0) {
            radiantRewardManager.redeemEntitledRDNT();
        }

        // sell rewards
        uint256 totalUsdt;

        uint256 esRdntBalance = esRdnt.balanceOf(address(this));
        if (esRdntBalance > 0) {
            totalUsdt += PancakeSwapV3Library.pathSwap(
                pancakeSwapV3Router,
                address(esRdnt),
                abi.encodePacked(address(esRdnt), uint24(2500), address(rdnt), uint24(2500), address(wBnb), uint24(100), address(usdt)),
                address(this),
                esRdntBalance,
                0
            );
        }

        if (totalUsdt > 0) {
            usdt.transfer(_to, totalUsdt);
        }

        return totalUsdt;
    }
}
