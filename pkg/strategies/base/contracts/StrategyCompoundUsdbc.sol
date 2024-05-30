// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/CompoundV3.sol";
import "@overnight-contracts/core/contracts/interfaces/IInchSwapper.sol";

contract StrategyCompoundUsdbc is Strategy {

    // --- structs

    struct StrategyParams {
        address usdc;
        address usdbc;
        address comp;
        address cUsdbc;
        address compoundRewards;
        address rewardWallet;
        address inchSwapper;
    }

    // --- params

    IERC20 public usdbc;
    IERC20 public comp;
    IComet public cUsdbc;
    ICometRewards public compoundRewards;
    address public rewardWallet;
    IERC20 public usdc;
    IInchSwapper public inchSwapper;
    uint256 public usdcDm;
    uint256 public usdbcDm;

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
        require(params.usdc != address(0), 'usdc is empty');
        require(params.comp != address(0), 'comp is empty');
        require(params.cUsdbc != address(0), 'cUsdbc is empty');
        require(params.compoundRewards != address(0), 'compoundRewards is empty');
        require(params.rewardWallet != address(0), 'rewardWallet is empty');
        require(params.inchSwapper != address(0), "inchSwapper is zero");

        usdbc = IERC20(params.usdbc);
        usdc = IERC20(params.usdc);
        comp = IERC20(params.comp);
        cUsdbc = IComet(params.cUsdbc);
        compoundRewards = ICometRewards(params.compoundRewards);
        rewardWallet = params.rewardWallet;

        inchSwapper = IInchSwapper(params.inchSwapper);
        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();
        usdbcDm = 10 ** IERC20Metadata(params.usdbc).decimals();

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(address _asset, uint256 _amount) internal override {
        // swap asset to underlying to stake
        usdc.approve(address(inchSwapper), _amount);
        uint256 amountOutMin = OvnMath.subBasisPoints(_amount, swapSlippageBP);
        inchSwapper.swap(address(this), address(usdc), address(usdbc), _amount, amountOutMin);
        // mint by underlying
        uint256 usdbcBalance = usdbc.balanceOf(address(this));
        usdbc.approve(address(cUsdbc), usdbcBalance);
        cUsdbc.supply(address(usdbc), usdbcBalance);
    }

    function _unstake(address _asset, uint256 _amount, address _beneficiary) internal override returns (uint256) {
        uint256 amountToRedeem = OvnMath.addBasisPoints(_amount, swapSlippageBP);
        cUsdbc.withdraw(address(usdbc), amountToRedeem);
        uint256 usdbcBalance = usdbc.balanceOf(address(this));
        usdbc.approve(address(inchSwapper), usdbcBalance);
        uint256 amountOutMin = OvnMath.subBasisPoints(usdbcBalance, swapSlippageBP);
        inchSwapper.swap(address(this), address(usdbc), address(usdc), usdbcBalance, amountOutMin);
        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(address _asset, address _beneficiary) internal override returns (uint256) {
        cUsdbc.withdraw(address(usdbc), cUsdbc.balanceOf(address(this)));
        uint256 usdbcBalance = usdbc.balanceOf(address(this));
        usdbc.approve(address(inchSwapper), usdbcBalance);
        uint256 amountOutMin = OvnMath.subBasisPoints(usdbcBalance, swapSlippageBP);
        inchSwapper.swap(address(this), address(usdbc), address(usdc), usdbcBalance, amountOutMin);
        return usdc.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        return usdbc.balanceOf(address(this)) + usdc.balanceOf(address(this)) + cUsdbc.balanceOf(address(this));
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
