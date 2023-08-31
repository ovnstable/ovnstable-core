// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/CompoundV3.sol";

contract StrategyCompoundUsdbc is Strategy {

    // --- structs

    struct StrategyParams {
        address usdbc;
        address comp;
        address cUsdbc;
        address compoundRewards;
        address rewardWallet;
    }

    // --- params

    IERC20 public usdbc;
    IERC20 public comp;
    IComet public cUsdbc;
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
        require(params.usdbc != address(0), 'usdbc is empty');
        require(params.comp != address(0), 'comp is empty');
        require(params.cUsdbc != address(0), 'cUsdbc is empty');
        require(params.compoundRewards != address(0), 'compoundRewards is empty');
        require(params.rewardWallet != address(0), 'rewardWallet is empty');

        usdbc = IERC20(params.usdbc);
        comp = IERC20(params.comp);
        cUsdbc = IComet(params.cUsdbc);
        compoundRewards = ICometRewards(params.compoundRewards);
        rewardWallet = params.rewardWallet;

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
        usdbc.approve(address(cUsdbc), _amount);
        cUsdbc.supply(address(usdbc), usdbc.balanceOf(address(this)));
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        cUsdbc.withdraw(address(usdbc), _amount);
        return usdbc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        cUsdbc.withdraw(address(usdbc), cUsdbc.balanceOf(address(this)));
        return usdbc.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        return usdbc.balanceOf(address(this)) + cUsdbc.balanceOf(address(this));
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        uint256 totalUsdbc = usdbc.balanceOf(address(this));

        // claim rewards
        if (cUsdbc.balanceOf(address(this)) > 0) {
            compoundRewards.claim(address(cUsdbc), address(this), true);
        }

        // transfer comp to rewardWallet
        uint256 compBalance = comp.balanceOf(address(this));
        if (compBalance > 0) {
            comp.transfer(rewardWallet, compBalance);
        }

        totalUsdbc = usdbc.balanceOf(address(this)) - totalUsdbc;
        if (totalUsdbc > 0) {
            usdbc.transfer(_to, totalUsdbc);
        }

        return totalUsdbc;
    }

}
