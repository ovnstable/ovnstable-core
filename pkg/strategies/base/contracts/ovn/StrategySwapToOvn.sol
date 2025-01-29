// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import '@overnight-contracts/core/contracts/Strategy.sol';
import '@overnight-contracts/connectors/contracts/stuff/Silo.sol';
import '@overnight-contracts/connectors/contracts/stuff/Chainlink.sol';
import '@overnight-contracts/core/contracts/interfaces/IInchSwapper.sol';
import '@overnight-contracts/connectors/contracts/stuff/Aerodrome.sol';
import {AerodromeLibrary} from "@overnight-contracts/connectors/contracts/stuff/Aerodrome.sol";
import "hardhat/console.sol";

/**
 * This strategy holds OVN and on ClaimRewards swaps USD+ to OVN
 */
contract StrategySwapToOvn is Strategy {

    bytes32 public constant UNIT_ROLE = keccak256("UNIT_ROLE");
   
    IERC20 public usdPlus;
    IERC20 public ovn;
    IInchSwapper public inchSwapper;
    uint256 public slippageBp;
    uint256 public ovnOraclePriceExpiration;
    uint256 public ovnDm;
    uint256 public usdPlusDm;
    uint256 public ovnUsdPriceDm;

    // state
    uint256 ovnUsdPrice;
    uint256 ovnUsdPriceUpdateTimestamp;

    event StrategyUpdatedParams();

    struct StrategyParams {
        address usdPlus;
        address ovn;
        address inchSwapper;
        uint256 slippageBp;
        uint256 ovnOraclePriceExpiration;
        uint256 ovnUsdPriceDecimals;
    }

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() public initializer {
        __Strategy_init();
    }

    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        usdPlus = IERC20(params.usdPlus);        
        ovn = IERC20(params.ovn);        
        inchSwapper = IInchSwapper(params.inchSwapper);
        slippageBp = params.slippageBp;
        ovnOraclePriceExpiration = params.ovnOraclePriceExpiration;        

        usdPlusDm = 10 ** IERC20Metadata(params.usdPlus).decimals();
        ovnDm = 10 ** IERC20Metadata(params.ovn).decimals();
        ovnUsdPriceDm = 10**params.ovnUsdPriceDecimals;
    }

    // --- logic

    function _stake(address _asset, uint256 _amount) internal override {
    }

    function _unstake(address _asset, uint256 _amount, address _beneficiary) internal override returns (uint256) {
        return ovn.balanceOf(address(this));
    }

    function _unstakeFull(address _asset, address _beneficiary) internal override returns (uint256) {
        return ovn.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return ovn.balanceOf(address(this));
    }

    function liquidationValue() external view override returns (uint256) {
        return this.netAssetValue();
    }

    // here we swap USDPlus token to OVN
    function _claimRewards(address _to) internal override returns (uint256) {
        uint256 underlyingUsdPlusBalance = usdPlus.balanceOf(address(this));
        if (underlyingUsdPlusBalance == 0) {
            return 0;
        }

        require(block.timestamp - ovnUsdPriceUpdateTimestamp <= ovnOraclePriceExpiration, "OVN price expired");

        uint256 ovnBalanceBefore = ovn.balanceOf(address(this));
        console.log("ovnBalanceBefore:", ovnBalanceBefore);
        uint256 outOvnBalanceEstimated = (underlyingUsdPlusBalance * ovnUsdPriceDm * ovnDm)  / (ovnUsdPrice * usdPlusDm);
        console.log("outOvnBalanceEstimated:", outOvnBalanceEstimated);
        uint256 amountOutMin = OvnMath.subBasisPoints(outOvnBalanceEstimated, slippageBp);
        console.log("amountOutMin:", amountOutMin);

        usdPlus.approve(address(inchSwapper), underlyingUsdPlusBalance);
        inchSwapper.swap(address(this), address(usdPlus), address(ovn), underlyingUsdPlusBalance, amountOutMin);

        uint256 ovnBalanceAfter = ovn.balanceOf(address(this));
        console.log("ovnBalanceAfter:", ovnBalanceAfter);
        uint256 totalRewardsClaimedOvn = ovnBalanceAfter - ovnBalanceBefore;
        console.log("totalRewardsClaimedOvn:", totalRewardsClaimedOvn);

        require(totalRewardsClaimedOvn >= amountOutMin, "Swapped OVN is less than amountOutMin");

        if (totalRewardsClaimedOvn > 0) {
            ovn.transfer(_to, totalRewardsClaimedOvn);
        }

        return totalRewardsClaimedOvn;
    }

    // precision is 10
    function updateOvnUsdPrice(uint256 _ovnUsdPrice) external {
        require(roleManager.hasRole(UNIT_ROLE, msg.sender), "Restricted to Unit");

        ovnUsdPrice = _ovnUsdPrice;
        ovnUsdPriceUpdateTimestamp = block.timestamp;
    }
}
