// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import '@overnight-contracts/core/contracts/Strategy.sol';
import '@overnight-contracts/connectors/contracts/stuff/Silo.sol';
import '@overnight-contracts/connectors/contracts/stuff/Camelot.sol';
import '@overnight-contracts/connectors/contracts/stuff/Angle.sol';

contract StrategySiloEth is Strategy {
    // --- params

    IERC20 public eth;
    ISilo public silo;
    ISiloIncentivesController public siloIncentivesController;
    address public siloTower;

    IERC20 public siloToken;
    ICamelotRouter public camelotRouter;

    IERC20 public arbToken;
    address public rewardWallet;

    IDistributor public distributor;

    // --- events

    event StrategyUpdatedParams();

    // --- structs

    struct StrategyParams {
        address eth;
        address silo;
        address siloIncentivesController;
        address siloTower;
        address siloToken;
        address arbToken;
        address rewardWallet;
        address camelotRouter;
        address distributor;
    }

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() public initializer {
        __Strategy_init();
    }

    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        eth = IERC20(params.eth);
        silo = ISilo(params.silo);
        siloIncentivesController = ISiloIncentivesController(params.siloIncentivesController);
        siloTower = params.siloTower;
        siloToken = IERC20(params.siloToken);
        arbToken = IERC20(params.arbToken);
        rewardWallet = params.rewardWallet;
        camelotRouter = ICamelotRouter(params.camelotRouter);
        distributor = IDistributor(params.distributor);
    }

    // --- logic

    function _stake(address _asset, uint256 _amount) internal override {
        uint256 amount = eth.balanceOf(address(this));
        eth.approve(address(silo), amount);
        silo.deposit(address(eth), amount, false);
    }

    function _unstake(address _asset, uint256 _amount, address _beneficiary) internal override returns (uint256) {
        silo.withdraw(address(eth), _amount, false);

        return eth.balanceOf(address(this));
    }

    function _unstakeFull(address _asset, address _beneficiary) internal override returns (uint256) {
        if (this.netAssetValue() == 0) {
            return 0;
        }

        // Need to update internal cumulative rate for recalculating full nav.
        // If you don’t do this, you’ll have pennies in nav (0.000001 for example ) left after unstakeFull
        silo.withdraw(address(eth), 1, false);

        ISiloLens siloLens = ISiloLens(ISiloTower(siloTower).coordinates('SiloLens'));
        uint256 balanceInCollateral = siloLens.collateralBalanceOfUnderlying(silo, address(eth), address(this));

        silo.withdraw(address(eth), balanceInCollateral, false);

        return eth.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        ISiloLens siloLens = ISiloLens(ISiloTower(siloTower).coordinates('SiloLens'));
        uint256 balanceInCollateral = siloLens.collateralBalanceOfUnderlying(silo, address(eth), address(this));
        uint256 balanceInCash = eth.balanceOf(address(this));

        return balanceInCollateral + balanceInCash;
    }

    function liquidationValue() external view override returns (uint256) {
        return this.netAssetValue();
    }

    function _claimRewards(address _to) internal override returns (uint256) {
        uint256 baseBalanceBefore = eth.balanceOf(address(this));

        IShareToken collateralToken = silo.assetStorage(address(eth)).collateralToken;
        address[] memory assets = new address[](1);
        assets[0] = address(collateralToken);
        siloIncentivesController.claimRewards(assets, type(uint256).max, address(this));

        uint256 siloBalance = siloToken.balanceOf(address(this));
        uint256 arbBalance = arbToken.balanceOf(address(this));

        if (arbBalance > 0) {
            arbToken.transfer(rewardWallet, arbBalance);
        }

        if (siloBalance > 0) {
            uint256 siloAmount = CamelotLibrary.getAmountsOut(
                camelotRouter,
                address(siloToken),
                address(eth),
                siloBalance
            );

            if (siloAmount > 0) {
                CamelotLibrary.singleSwap(
                    camelotRouter,
                    address(siloToken),
                    address(eth),
                    siloBalance,
                    (siloAmount * 99) / 100,
                    address(this)
                );
            }
        }

        uint256 totalEth = eth.balanceOf(address(this)) - baseBalanceBefore;

        if (totalEth > 0) {
            eth.transfer(_to, totalEth);
        }

        return totalEth;
    }

    function whitelistAngleOperator(address operator) external onlyAdmin {
        distributor.toggleOperator(address(this), operator);
    }

    function withdrawERC20(address tokenAddress, address to, uint256 amount) external onlyAdmin {
        require(IERC20(tokenAddress).transfer(to, amount), 'Transfer failed');
    }
}
