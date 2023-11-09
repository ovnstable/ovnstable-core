// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Silo.sol";
import "@overnight-contracts/connectors/contracts/stuff/Camelot.sol";

contract StrategySiloUsdc is Strategy {

    // --- params

    IERC20 public usdc;
    ISilo public silo;
    ISiloIncentivesController public siloIncentivesController;
    address public siloTower;

    IERC20 public siloToken;
    IERC20 public wethToken;
    ICamelotRouter public camelotRouter;

    // --- events

    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address usdc;
        address silo;
        address siloIncentivesController;
        address siloTower;
        address siloToken;
        address wethToken;
        address camelotRouter;
    }


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        usdc = IERC20(params.usdc);
        silo = ISilo(params.silo);
        siloIncentivesController = ISiloIncentivesController(params.siloIncentivesController);
        siloTower = params.siloTower;
        siloToken = IERC20(params.siloToken);
        wethToken = IERC20(params.wethToken);
        camelotRouter = ICamelotRouter(params.camelotRouter);
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        uint256 amount = usdc.balanceOf(address(this));
        usdc.approve(address(silo), amount);
        silo.deposit(
            address(usdc),
            amount,
            false
        );
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        silo.withdraw(
            address(usdc),
            _amount,
            false
        );

        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        if(this.netAssetValue() == 0){
            return 0;
        }

        // Need to update internal cumulative rate for recalculating full nav.
        // If you don’t do this, you’ll have pennies in nav (0.000001 for example ) left after unstakeFull
        silo.withdraw(
            address(usdc),
            1,
            false
        );

        ISiloLens siloLens = ISiloLens(ISiloTower(siloTower).coordinates('SiloLens'));
        uint256 balanceInCollateral = siloLens.collateralBalanceOfUnderlying(silo, address(usdc), address(this));

        silo.withdraw(
            address(usdc),
            balanceInCollateral,
            false
        );

        return usdc.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        ISiloLens siloLens = ISiloLens(ISiloTower(siloTower).coordinates('SiloLens'));
        uint256 balanceInCollateral = siloLens.collateralBalanceOfUnderlying(silo, address(usdc), address(this));
        uint256 balanceInCash = usdc.balanceOf(address(this));

        return balanceInCollateral + balanceInCash;
    }

    function liquidationValue() external view override returns (uint256) {
        return this.netAssetValue();
    }


    function _claimRewards(address _to) internal override returns (uint256) {
        uint256 baseBalanceBefore = usdc.balanceOf(address(this));

        IShareToken collateralToken = silo.assetStorage(address(usdc)).collateralToken;
        address[] memory assets = new address[](1);
        assets[0] = address(collateralToken);
        siloIncentivesController.claimRewards(
            assets,
            type(uint256).max,
            address(this)
        );


        IERC20 arbToken = IERC20(address(0x912CE59144191C1204E64559FE8253a0e49E6548));
        uint256 arbBalance = arbToken.balanceOf(address(this));

        if (arbBalance > 0) {

            uint256 arbAmount = CamelotLibrary.getAmountsOut(
                camelotRouter,
                address(arbToken),
                address(wethToken),
                address(usdc),
                arbBalance
            );

            if (arbAmount > 0) {
                CamelotLibrary.multiSwap(
                    camelotRouter,
                    address(arbToken),
                    address(wethToken),
                    address(usdc),
                    arbBalance,
                    arbAmount * 99 / 100,
                    address(this)
                );
            }
        }

        uint256 totalUsdc = usdc.balanceOf(address(this)) - baseBalanceBefore;

        if (totalUsdc > 0) {
            usdc.transfer(_to, totalUsdc);
        }

        return totalUsdc;
    }

}
