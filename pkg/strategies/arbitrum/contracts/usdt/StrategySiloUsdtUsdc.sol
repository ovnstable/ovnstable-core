// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import '@overnight-contracts/core/contracts/Strategy.sol';
import '@overnight-contracts/connectors/contracts/stuff/Silo.sol';
import '@overnight-contracts/connectors/contracts/stuff/Camelot.sol';
import '@overnight-contracts/core/contracts/interfaces/IInchSwapper.sol';
import '@overnight-contracts/connectors/contracts/stuff/Chainlink.sol';

contract StrategySiloUsdtUsdc is Strategy {
    // --- params

    IERC20 public usdt;
    IERC20 public usdc;
    ISilo public silo;
    ISiloIncentivesController public siloIncentivesController;
    address public siloTower;

    IERC20 public siloToken;
    IERC20 public wethToken;
    ICamelotRouter public camelotRouter;

    IPriceFeed public oracleUsdt;
    IPriceFeed public oracleUsdc;

    IInchSwapper public inchSwapper;

    uint256 public usdtDm;
    uint256 public usdcDm;

    IERC20 public arbToken;
    address public rewardWallet;

    // --- events

    event StrategyUpdatedParams();

    // --- structs

    struct StrategyParams {
        address usdt;
        address usdc;
        address silo;
        address siloIncentivesController;
        address siloTower;
        address siloToken;
        address arbToken;
        address rewardWallet;
        address wethToken;
        address camelotRouter;
        address inchSwapper;
        address oracleUsdt;
        address oracleUsdc;
    }

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() public initializer {
        __Strategy_init();
    }

    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        usdt = IERC20(params.usdt);
        usdc = IERC20(params.usdc);
        inchSwapper = IInchSwapper(params.inchSwapper);
        silo = ISilo(params.silo);
        siloIncentivesController = ISiloIncentivesController(params.siloIncentivesController);
        siloTower = params.siloTower;
        siloToken = IERC20(params.siloToken);
        arbToken = IERC20(params.arbToken);
        wethToken = IERC20(params.wethToken);
        camelotRouter = ICamelotRouter(params.camelotRouter);
        oracleUsdt = IPriceFeed(params.oracleUsdt);
        oracleUsdc = IPriceFeed(params.oracleUsdc);

        usdtDm = 10 ** IERC20Metadata(params.usdt).decimals();
        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();

        rewardWallet = params.rewardWallet;
    }

    // --- logic

    function _stake(address _asset, uint256 _amount) internal override {
        usdt.approve(address(inchSwapper), _amount);
        uint256 amountOutMin = OvnMath.subBasisPoints(_oracleUsdtToUsdc(_amount), swapSlippageBP);
        inchSwapper.swap(address(this), address(usdt), address(usdc), _amount, amountOutMin);

        uint256 amount = usdc.balanceOf(address(this));
        usdc.approve(address(silo), amount);
        silo.deposit(address(usdc), amount, false);
    }

    function _unstake(address _asset, uint256 _amount, address _beneficiary) internal override returns (uint256) {
        uint256 amountToRedeem = OvnMath.addBasisPoints(_oracleUsdtToUsdc(_amount), swapSlippageBP);
        silo.withdraw(address(usdc), amountToRedeem, false);

        uint256 usdcBalance = usdc.balanceOf(address(this));
        usdc.approve(address(inchSwapper), usdcBalance);
        uint256 amountOutMin = OvnMath.subBasisPoints(_oracleUsdcToUsdt(usdcBalance), swapSlippageBP);
        inchSwapper.swap(address(this), address(usdc), address(usdt), usdcBalance, amountOutMin);

        return usdt.balanceOf(address(this));
    }

    function _unstakeFull(address _asset, address _beneficiary) internal override returns (uint256) {
        if (this.netAssetValue() == 0) {
            return 0;
        }

        // Need to update internal cumulative rate for recalculating full nav.
        // If you don’t do this, you’ll have pennies in nav (0.000001 for example ) left after unstakeFull
        silo.withdraw(address(usdc), 1, false);

        ISiloLens siloLens = ISiloLens(ISiloTower(siloTower).coordinates('SiloLens'));
        uint256 balanceInCollateral = siloLens.collateralBalanceOfUnderlying(silo, address(usdc), address(this));

        silo.withdraw(address(usdc), balanceInCollateral, false);

        uint256 usdcBalance = usdc.balanceOf(address(this));
        usdc.approve(address(inchSwapper), usdcBalance);
        uint256 amountOutMin = OvnMath.subBasisPoints(_oracleUsdcToUsdt(usdcBalance), swapSlippageBP);
        inchSwapper.swap(address(this), address(usdc), address(usdt), usdcBalance, amountOutMin);

        return usdt.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue(true);
    }

    function _totalValue(bool nav) internal view returns (uint256) {
        ISiloLens siloLens = ISiloLens(ISiloTower(siloTower).coordinates('SiloLens'));
        uint256 balanceInCollateralUsdc = siloLens.collateralBalanceOfUnderlying(silo, address(usdc), address(this));
        uint256 balanceInCashUsdc = usdc.balanceOf(address(this));

        uint256 totalUsdc = balanceInCollateralUsdc + balanceInCashUsdc;
        uint256 totalUsdt = usdt.balanceOf(address(this));

        if (nav) {
            return _oracleUsdcToUsdt(totalUsdc) + totalUsdt;
        } else {
            return OvnMath.subBasisPoints(_oracleUsdcToUsdt(totalUsdc), swapSlippageBP) + totalUsdt;
        }
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue(false);
    }

    function _claimRewards(address _to) internal override returns (uint256) {
        uint256 baseBalanceBefore = usdt.balanceOf(address(this));

        IShareToken collateralToken = silo.assetStorage(address(usdc)).collateralToken;
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
                address(usdt),
                siloBalance
            );
            if (siloAmount > 0) {
                CamelotLibrary.multiSwap(
                    camelotRouter,
                    address(siloToken),
                    address(wethToken),
                    address(usdt),
                    siloBalance,
                    (siloAmount * 99) / 100,
                    address(this)
                );
            }
        }

        uint256 totalUsdt = usdt.balanceOf(address(this)) - baseBalanceBefore;

        if (totalUsdt > 0) {
            usdt.transfer(_to, totalUsdt);
        }

        return totalUsdt;
    }

    function _oracleUsdtToUsdc(uint256 usdtAmount) internal view returns (uint256) {
        uint256 priceUsdt = ChainlinkLibrary.getPrice(oracleUsdt);
        uint256 priceUsdc = ChainlinkLibrary.getPrice(oracleUsdc);
        return ChainlinkLibrary.convertTokenToToken(usdtAmount, usdtDm, usdcDm, priceUsdt, priceUsdc);
    }

    function _oracleUsdcToUsdt(uint256 usdcAmount) internal view returns (uint256) {
        uint256 priceUsdc = ChainlinkLibrary.getPrice(oracleUsdc);
        uint256 priceUsdt = ChainlinkLibrary.getPrice(oracleUsdt);
        return ChainlinkLibrary.convertTokenToToken(usdcAmount, usdcDm, usdtDm, priceUsdc, priceUsdt);
    }
}
