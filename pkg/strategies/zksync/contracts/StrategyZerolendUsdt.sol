// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Zerolend.sol";

interface IZkSync {
    function configurePointsOperator(address operator) external;
}

// --- errors

error TokensNotCompatible(address from, address to);
error NotEnoughTokens(address asset, uint256 amount);

contract StrategyZerolend is Strategy {
    address immutable ZERO_ADDRESS = 0x0000000000000000000000000000000000000000;
    IERC20 public usdt;
    IERC20 public z0USDT;
    IPool public pool;
    IRewardsController public rewardsController;
    IERC20 public earlyZERO;
    address public rewardsWallet;

    // --- events
    event StrategyUpdatedParams();

    // --- structs

    struct StrategyParams {
        address usdt;
        address z0USDT;
        address pool;
        address rewardsController;
        address earlyZERO;
        address rewardsWallet;
    }

    function initialize() public initializer {
         __Strategy_init();
    }

    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        usdt = IERC20(params.usdt);
        z0USDT = IERC20(params.z0USDT);
        pool = IPool(params.pool);
        rewardsController = IRewardsController(params.rewardsController);
        earlyZERO = IERC20(params.earlyZERO);
        rewardsWallet = params.rewardsWallet;

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(address _asset, uint256 _amount) internal override {
        if (_asset != address(usdt)) revert TokensNotCompatible(address(usdt), _asset);
        usdt.approve(address(pool), _amount);
        pool.deposit(address(usdt), _amount, address(this), 0);
    }

    function _unstake(address _asset, uint256 _amount, address _beneficiary) internal override returns (uint256) {
        if (_asset != address(usdt)) revert TokensNotCompatible(address(usdt), _asset);
        if (z0USDT.balanceOf(address(this)) < _amount) revert NotEnoughTokens(address(z0USDT), _amount);
        z0USDT.approve(address(pool), _amount);
        uint256 withdrawAmount = pool.withdraw(_asset, _amount, address(this));

        return withdrawAmount;
    }

    function _unstakeFull(address _asset, address _beneficiary) internal override returns (uint256) {
        if (_asset != address(usdt)) revert TokensNotCompatible(address(usdt), _asset);

        uint256 _amount = z0USDT.balanceOf(address(this));

        z0USDT.approve(address(pool), _amount);
        uint256 withdrawAmount = pool.withdraw(_asset, _amount, address(this));

        return withdrawAmount;
    }

    function netAssetValue() external view override returns (uint256) {
        return usdt.balanceOf(address(this)) + z0USDT.balanceOf(address(this));
    }

    function liquidationValue() external view override returns (uint256) {
        return usdt.balanceOf(address(this)) + z0USDT.balanceOf(address(this));
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {
        if (address(pool) == ZERO_ADDRESS) {
            return 0;
        }

        // claim rewards
        uint256 z0USDBBalance = z0USDT.balanceOf(address(this));
        if (z0USDBBalance == 0) {
            return 0;
        }

        address[] memory assets = new address[](1);
        assets[0] = address(z0USDT);
        uint256 claimedBalance = rewardsController.claimRewards(
            assets,
            type(uint256).max,
            address(this),
            address(earlyZERO)
        );
        uint256 rewardsBalance = earlyZERO.balanceOf(address(this));
        if (rewardsWallet != ZERO_ADDRESS && rewardsBalance > 0) earlyZERO.transfer(rewardsWallet, rewardsBalance);
        return 0;
    }
}
