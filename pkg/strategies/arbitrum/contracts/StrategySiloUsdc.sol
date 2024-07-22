// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import '@overnight-contracts/core/contracts/Strategy.sol';
import '@overnight-contracts/connectors/contracts/stuff/Silo.sol';
import '@overnight-contracts/connectors/contracts/stuff/Camelot.sol';
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/Angle.sol";
import "@overnight-contracts/core/contracts/interfaces/IInchSwapper.sol";

contract StrategySiloUsdc is Strategy {
    // --- params

    IERC20 public usdc;
    ISilo public silo;
    ISiloIncentivesController public siloIncentivesController;
    address public siloTower;

    IERC20 public siloToken;
    IERC20 public wethToken;
    ICamelotRouter public camelotRouter;

    IERC20 public arbToken;
    address public rewardWallet;
    IERC20 public underlyingAsset;
    IPriceFeed public oracleAsset;
    IPriceFeed public oracleUnderlyingAsset;
    uint256 public assetDm;
    uint256 public underlyingAssetDm;
    IInchSwapper public inchSwapper;

    IDistributor public distributor;

    // --- events

    event StrategyUpdatedParams();

    // --- structs

    struct StrategyParams {
        address usdc;
        address silo;
        address siloIncentivesController;
        address siloTower;
        address siloToken;
        address arbToken;
        address rewardWallet;
        address wethToken;
        address camelotRouter;
        address underlyingAsset;
        address oracleAsset;
        address oracleUnderlyingAsset;
        address inchSwapper;
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
        usdc = IERC20(params.usdc);
        silo = ISilo(params.silo);
        siloIncentivesController = ISiloIncentivesController(params.siloIncentivesController);
        siloTower = params.siloTower;
        siloToken = IERC20(params.siloToken);
        arbToken = IERC20(params.arbToken);
        wethToken = IERC20(params.wethToken);
        rewardWallet = params.rewardWallet;
        camelotRouter = ICamelotRouter(params.camelotRouter);
        underlyingAsset = IERC20(params.underlyingAsset);
        inchSwapper = IInchSwapper(params.inchSwapper);
        oracleAsset = IPriceFeed(params.oracleAsset);
        oracleUnderlyingAsset = IPriceFeed(params.oracleUnderlyingAsset);
        assetDm = 10 ** IERC20Metadata(params.usdc).decimals();
        underlyingAssetDm = 10 ** IERC20Metadata(params.underlyingAsset).decimals();
        distributor = IDistributor(params.distributor);
    }

    // --- logic

    function _stake(address _asset, uint256 _amount) internal override {
        if (address(underlyingAsset) == address(usdc)) {
            uint256 amount = usdc.balanceOf(address(this));
            usdc.approve(address(silo), amount);
            silo.deposit(address(usdc), amount, false);
            return;
        }
        usdc.approve(address(inchSwapper), _amount);
        uint256 amountOutMin = OvnMath.subBasisPoints(_oracleAssetToUnderlying(_amount), swapSlippageBP);
        inchSwapper.swap(address(this), address(usdc), address(underlyingAsset), _amount, amountOutMin);
        // mint by underlying
        uint256 underlyingBalance = underlyingAsset.balanceOf(address(this));
        underlyingAsset.approve(address(silo), underlyingBalance);
        silo.deposit(address(underlyingAsset), underlyingBalance, false);
    }

    function _unstake(address _asset, uint256 _amount, address _beneficiary) internal override returns (uint256) {
        
        if (address(underlyingAsset) == address(usdc)) {
            silo.withdraw(address(usdc), _amount, false);
            return usdc.balanceOf(address(this));
        }
         // convert usdc to underlying with some addition
        uint256 amountToRedeem = OvnMath.addBasisPoints(_oracleAssetToUnderlying(_amount), swapSlippageBP);

        // redeem usdc
        silo.withdraw(address(underlyingAsset), amountToRedeem, false);

        // swap underlying to usdc
        uint256 underlyingBalance = underlyingAsset.balanceOf(address(this));
        underlyingAsset.approve(address(inchSwapper), underlyingBalance);
        uint256 amountOutMin = OvnMath.subBasisPoints(_oracleUnderlyingToAsset(underlyingBalance), swapSlippageBP);
        inchSwapper.swap(address(this), address(underlyingAsset), address(usdc), underlyingBalance, amountOutMin);

        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(address _asset, address _beneficiary) internal override returns (uint256) {
        if (this.netAssetValue() == 0) {
            return 0;
        }

        // Need to update internal cumulative rate for recalculating full nav.
        // If you don’t do this, you’ll have pennies in nav (0.000001 for example ) left after unstakeFull
        silo.withdraw(address(underlyingAsset), 1, false);
        ISiloLens siloLens = ISiloLens(ISiloTower(siloTower).coordinates('SiloLens'));
        
        uint256 balanceInCollateral = siloLens.collateralBalanceOfUnderlying(silo, address(underlyingAsset), address(this));

        silo.withdraw(address(underlyingAsset), balanceInCollateral, false);  

        if (address(underlyingAsset) == address(usdc)) {      
            return usdc.balanceOf(address(this));
        }

        uint256 underlyingBalance = underlyingAsset.balanceOf(address(this));
        underlyingAsset.approve(address(inchSwapper), underlyingBalance);
        uint256 amountOutMin = OvnMath.subBasisPoints(_oracleUnderlyingToAsset(underlyingBalance), swapSlippageBP);
        inchSwapper.swap(address(this), address(underlyingAsset), address(usdc), underlyingBalance, amountOutMin);

        return usdc.balanceOf(address(this));


    }

    function netAssetValue() external view override returns (uint256) {
        ISiloLens siloLens = ISiloLens(ISiloTower(siloTower).coordinates('SiloLens'));
        uint256 balanceInCollateral = siloLens.collateralBalanceOfUnderlying(silo, address(underlyingAsset), address(this));
        uint256 balanceInCash = usdc.balanceOf(address(this));
        uint256 underlyingBalanceInCash = underlyingAsset.balanceOf(address(this));
        uint256 convertedBalance = _oracleUnderlyingToAsset(underlyingBalanceInCash + balanceInCollateral);

        return convertedBalance + balanceInCash;
    }

    function liquidationValue() external view override returns (uint256) {
        return this.netAssetValue();
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        uint256 baseBalanceBefore = usdc.balanceOf(address(this));
        uint256 underlyingBalanceBefore = underlyingAsset.balanceOf(address(this));

        IShareToken collateralToken = silo.assetStorage(address(underlyingAsset)).collateralToken;
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
                address(wethToken),
                address(underlyingAsset),
                siloBalance
            );

            if (siloAmount > 0) {
                CamelotLibrary.multiSwap(
                    camelotRouter,
                    address(siloToken),
                    address(wethToken),
                    address(underlyingAsset),
                    siloBalance,
                    (siloAmount * 99) / 100,
                    address(this)
                );
            }
        }

        uint256 totalUsdce = underlyingAsset.balanceOf(address(this)) - underlyingBalanceBefore;
        if(totalUsdce > 0){
            underlyingAsset.approve(address(inchSwapper), totalUsdce);
            uint256 amountOutMin = OvnMath.subBasisPoints(_oracleUnderlyingToAsset(totalUsdce), swapSlippageBP);
            inchSwapper.swap(address(this), address(underlyingAsset), address(usdc), totalUsdce, amountOutMin);
        }
        uint256 totalUsdc = usdc.balanceOf(address(this)) - baseBalanceBefore;
        

        if (totalUsdc > 0) {
            usdc.transfer(_to, totalUsdc);
        }

        return totalUsdc;
    }

    function _oracleAssetToUnderlying(uint256 assetAmount) internal view returns (uint256) {
        uint256 priceAsset = ChainlinkLibrary.getPrice(oracleAsset);
        uint256 priceUnderlyingAsset = ChainlinkLibrary.getPrice(oracleUnderlyingAsset);
        return ChainlinkLibrary.convertTokenToToken(assetAmount, assetDm, underlyingAssetDm, priceAsset, priceUnderlyingAsset);
    }

    function _oracleUnderlyingToAsset(uint256 underlyingAssetAmount) internal view returns (uint256) {
        uint256 priceAsset = ChainlinkLibrary.getPrice(oracleAsset);
        uint256 priceUnderlyingAsset = ChainlinkLibrary.getPrice(oracleUnderlyingAsset);
        return ChainlinkLibrary.convertTokenToToken(underlyingAssetAmount, underlyingAssetDm, assetDm, priceUnderlyingAsset, priceAsset);
    }

    function claimRewardsWithToggleOperator(address operator) external onlyAdmin() {
        distributor.toggleOperator(msg.sender, operator);
    }
}
