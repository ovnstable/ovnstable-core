// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/CompoundV3.sol";
import "@overnight-contracts/core/contracts/interfaces/IInchSwapper.sol";

contract StrategyCompound is Strategy {

    // --- structs

    struct StrategyParams {
        address usdc;
        address comp;
        address cUsdcV3;
        address compoundRewards;
        address rewardWallet;
    }

    // --- params

    IERC20 public usdc;
    IERC20 public comp;
    IComet public cUsdcV3;
    ICometRewards public compoundRewards;
    address public rewardWallet;

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
        require(params.usdc != address(0), 'usdc is empty');
        require(params.comp != address(0), 'comp is empty');
        require(params.cUsdcV3 != address(0), 'cUsdcV3 is empty');
        require(params.compoundRewards != address(0), 'compoundRewards is empty');
        require(params.rewardWallet != address(0), 'rewardWallet is empty');

        usdc = IERC20(params.usdc);
        comp = IERC20(params.comp);
        cUsdcV3 = IComet(params.cUsdcV3);
        compoundRewards = ICometRewards(params.compoundRewards);
        rewardWallet = params.rewardWallet;

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
        usdc.approve(address(cUsdcV3), _amount);
        cUsdcV3.supply(address(usdc), usdc.balanceOf(address(this)));
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        cUsdcV3.withdraw(address(usdc), _amount);
        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        cUsdcV3.withdraw(address(usdc), cUsdcV3.balanceOf(address(this)));
        return usdc.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        return usdc.balanceOf(address(this)) + cUsdcV3.balanceOf(address(this));
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        uint256 totalUsdbc = usdc.balanceOf(address(this));

        // claim rewards
        if (cUsdcV3.balanceOf(address(this)) > 0) {
            compoundRewards.claim(address(cUsdcV3), address(this), true);
        }

        // transfer comp to rewardWallet
        uint256 compBalance = comp.balanceOf(address(this));
        if (compBalance > 0) {
            comp.transfer(rewardWallet, compBalance);
        }

        totalUsdbc = usdc.balanceOf(address(this)) - totalUsdbc;
        if (totalUsdbc > 0) {
            usdc.transfer(_to, totalUsdbc);
        }

        return totalUsdbc;
    }

}
