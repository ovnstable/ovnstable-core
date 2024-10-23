// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import '@overnight-contracts/core/contracts/Strategy.sol';
import '@overnight-contracts/connectors/contracts/stuff/Silo.sol';
import '@overnight-contracts/connectors/contracts/stuff/Chainlink.sol';
import '@overnight-contracts/connectors/contracts/stuff/Aerodrome.sol';
import {AerodromeLibrary} from "@overnight-contracts/connectors/contracts/stuff/Aerodrome.sol";

import "hardhat/console.sol";

contract StrategySiloUsdc is Strategy {
    // minimum USDC balance to withdraw in rewards
    uint256 internal constant MIN_USDC_REWARDS = 1_000_000;

    // --- params
    
    IERC20 public usdc;
    address public weth;
    ISilo public silo;
    ISiloIncentivesController public siloIncentivesController;
    address public siloLens;
    IERC20 public siloToken;
    IRouter public aerodromeRouter;
    uint256 public assetDm;
    address public siloWethPool;
    address public wethUsdcPool;

    // --- events

    event StrategyUpdatedParams();

    // --- structs

    struct StrategyParams {
        address usdc;
        address weth;
        address silo;
        address siloIncentivesController;
        address siloLens;
        address siloToken;
        address aerodromeRouter;
        address siloWethPool;
        address wethUsdcPool;
    }

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() public initializer {
        __Strategy_init();
    }

    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        usdc = IERC20(params.usdc);
        weth = params.weth;
        silo = ISilo(params.silo);
        siloIncentivesController = ISiloIncentivesController(params.siloIncentivesController);
        siloLens = params.siloLens;
        siloToken = IERC20(params.siloToken);        
        aerodromeRouter = IRouter(params.aerodromeRouter);
        siloWethPool = params.siloWethPool;
        wethUsdcPool = params.wethUsdcPool;

        assetDm = 10 ** IERC20Metadata(params.usdc).decimals();
    }

    // --- logic

    function _stake(address _asset, uint256 _amount) internal override {
        uint256 amount = usdc.balanceOf(address(this));
        if (amount == 0) {
            return;
        }
        usdc.approve(address(silo), amount);
         // deposit with collateralOnly=false in order to earn interest. Withdraw also with collateralOnly=false.
        silo.deposit(address(usdc), amount, false);
    }

    function _unstake(address _asset, uint256 _amount, address _beneficiary) internal override returns (uint256) {
        silo.withdraw(address(usdc), _amount, false);
        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(address _asset, address _beneficiary) internal override returns (uint256) {
        if (this.netAssetValue() == 0) {
            return 0;
        }

        // Need to update internal cumulative rate for recalculating full nav.
        // If you don’t do this, you’ll have pennies in nav (0.000001 for example ) left after unstakeFull
        // Georgii: I leave it as is although no difference noticed b/w this and straigthforward withdrawal.
        silo.withdraw(address(usdc), 1, false);

        ISiloLens siloLens_ = ISiloLens(siloLens);

        uint256 balanceInCollateral = siloLens_.collateralBalanceOfUnderlying(silo, address(usdc), address(this));

        silo.withdraw(address(usdc), balanceInCollateral, false);

        return usdc.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        ISiloLens siloLens_ = ISiloLens(siloLens);
        uint256 balanceInCash = usdc.balanceOf(address(this));

        // calculate user deposited amount with interest
        uint256 uint256depAmount = siloLens_.getDepositAmount(silo, address(usdc), address(this), block.timestamp);

        return uint256depAmount + balanceInCash;
    }

    function liquidationValue() external view override returns (uint256) {
        return this.netAssetValue();
    }

    function _claimRewards(address _to) internal override returns (uint256) {
        uint256 usdcBalanceBefore = usdc.balanceOf(address(this));

        IShareToken collateralToken = silo.assetStorage(address(usdc)).collateralToken;
        address[] memory assets = new address[](1);
        assets[0] = address(collateralToken);

        siloIncentivesController.claimRewards(assets, type(uint256).max, address(this));

        uint256 siloBalance = siloToken.balanceOf(address(this));

        if (siloBalance == 0) {
            return 0;
        }

        uint256 outSwapUsdcBalance = AerodromeLibrary.getAmountsOut(
            address(aerodromeRouter), 
            address(siloToken),
            weth,
            address(usdc),
            siloWethPool,
            wethUsdcPool,
            siloBalance
        );
        
        if (outSwapUsdcBalance < MIN_USDC_REWARDS) {
            return 0;
        }

        AerodromeLibrary.multiSwap(
            address(aerodromeRouter), 
            address(siloToken), 
            weth,
            address(usdc),
            siloWethPool,
            wethUsdcPool,
            siloBalance,
            outSwapUsdcBalance * 99 / 100,
            address(this)
        );

        uint256 usdcBalanceAfter = usdc.balanceOf(address(this));
        uint256 totalRewardsClaimedUsdc = usdcBalanceAfter - usdcBalanceBefore;

        if (totalRewardsClaimedUsdc > 0) {
            usdc.transfer(_to, totalRewardsClaimedUsdc);
        }

        return totalRewardsClaimedUsdc;
    }
}
