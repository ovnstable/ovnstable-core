// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/AaveV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/Velodrome.sol";

import "@overnight-contracts/common/contracts/libraries/WadRayMath.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";

import "@overnight-contracts/core/contracts/interfaces/IExchange.sol";

import "./libraries/WethUsdcLibrary.sol";
import "./core/HedgeStrategy.sol";
import "./control/ControlWethUsdc.sol";

import "hardhat/console.sol";

contract StrategyWethUsdc is HedgeStrategy {
    using WadRayMath for uint256;
    using WethUsdcLibrary for StrategyWethUsdc;


    uint256 public constant INTEREST_RATE_MODE = 2;
    uint16 public constant REFERRAL_CODE = 0;
    uint256 public constant MAX_UINT_VALUE = type(uint256).max;

    IExchange public exchange;
    ControlWethUsdc public control;
    
    IERC20 public usdPlus;
    IERC20 public weth;
    IERC20 public usdc;
    IERC20 public velo;

    uint256 public wethDm;
    uint256 public usdcDm;

    IRouter public router;
    IGauge public gauge;
    IPair public pair;

    ISwapRouter public uniswapV3Router;
    uint24 public poolFee0;
    uint24 public poolFee1;
    
    IPoolAddressesProvider public aavePoolAddressesProvider;
    IPriceFeed public oracleWeth;
    IPriceFeed public oracleUsdc;

    uint256 public tokenAssetSlippagePercent;
    uint256 public liquidationThreshold;
    uint256 public healthFactor;
    uint256 public realHealthFactor;

    IRewardsController public rewardsController;

    IERC20 public aUsdc;
    IERC20 public op;

    bool public isStableVeloUsdc;
    bool public isStableOpUsdc;


    struct SetupParams {
        address exchange;
        address control;
        address usdPlus;
        address weth;
        address usdc;
        address velo;
        address router;
        address gauge;
        address pair;
        address uniswapV3Router;
        uint24 poolFee0;
        uint24 poolFee1;
        address aavePoolAddressesProvider;
        uint256 tokenAssetSlippagePercent;
        uint256 liquidationThreshold;
        uint256 healthFactor;
        address rewardsController;
        address aUsdc;
        address op;
        bool isStableVeloUsdc;
        bool isStableOpUsdc;
    }


    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }

    // --- setters

    function setParams(SetupParams calldata params) external onlyAdmin {
        exchange = IExchange(params.exchange);
        control = ControlWethUsdc(params.control);

        usdPlus = IERC20(params.usdPlus);
        weth = IERC20(params.weth);
        usdc = IERC20(params.usdc);
        velo = IERC20(params.velo);

        wethDm = 10 ** IERC20Metadata(params.weth).decimals();
        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();

        router = IRouter(params.router);
        gauge = IGauge(params.gauge);
        pair = IPair(params.pair);

        uniswapV3Router = ISwapRouter(params.uniswapV3Router);
        poolFee0 = params.poolFee0;
        poolFee1 = params.poolFee1;

        aavePoolAddressesProvider = IPoolAddressesProvider(params.aavePoolAddressesProvider);
        IAaveOracle priceOracleGetter = IAaveOracle(aavePoolAddressesProvider.getPriceOracle());
        oracleWeth = IPriceFeed(priceOracleGetter.getSourceOfAsset(params.weth));
        oracleUsdc = IPriceFeed(priceOracleGetter.getSourceOfAsset(params.usdc));

        tokenAssetSlippagePercent = params.tokenAssetSlippagePercent;
        liquidationThreshold = params.liquidationThreshold * 10 ** 15;
        healthFactor = params.healthFactor * 10 ** 15;
        realHealthFactor = 0;

        rewardsController = IRewardsController(params.rewardsController);

        aUsdc = IERC20(params.aUsdc);
        op = IERC20(params.op);

        isStableVeloUsdc = params.isStableVeloUsdc;
        isStableOpUsdc = params.isStableOpUsdc;

        setAsset(params.usdPlus);

        weth.approve(address(router), MAX_UINT_VALUE);
        usdc.approve(address(router), MAX_UINT_VALUE);
        pair.approve(address(router), MAX_UINT_VALUE);
        pair.approve(address(gauge), MAX_UINT_VALUE);

        usdPlus.approve(address(exchange), MAX_UINT_VALUE);
        usdc.approve(address(exchange), MAX_UINT_VALUE);

        if (address(control) != address(0)) {
            revokeRole(CONTROL_ROLE, address(control));
        }
        grantRole(CONTROL_ROLE, address(control));
        control.setStrategy(payable(this));
    }

    // --- logic

    function _stake(uint256 _amount) internal override {
        control.calcDeltas(Method.STAKE, _amount);
    }

    function _unstake(
        uint256 _amount
    ) internal override returns (uint256) {
        control.calcDeltas(Method.UNSTAKE, OvnMath.addBasisPoints(_amount, 1));
        return _amount;
    }

    function netAssetValue() external view override returns (uint256){
        return control.netAssetValue();
    }

    function balances() external view override returns(BalanceItem[] memory ){
        return control.balances();
    }

    function _balance() internal override returns (uint256) {
        control.calcDeltas(Method.NOTHING, 0);
        return realHealthFactor;
    }

    function setRealHealthFactor(uint256 _realHealthFactor) external onlyControl {
        realHealthFactor = _realHealthFactor;
    }

    function currentHealthFactor() external view override returns (uint256){
        return realHealthFactor;
    }

    function _setHealthFactor(uint256 newHealthFactor) internal override {
        healthFactor = newHealthFactor;
    }

    function executeAction(Action memory action) external {
        if (action.actionType == ActionType.ADD_LIQUIDITY) {
            console.log("execute action ADD_LIQUIDITY");
            WethUsdcLibrary._addLiquidity(this, action.amount);
        } else if (action.actionType == ActionType.REMOVE_LIQUIDITY) {
            console.log("execute action REMOVE_LIQUIDITY");
            WethUsdcLibrary._removeLiquidity(this, action.amount);
        } else if (action.actionType == ActionType.SWAP_USDPLUS_TO_ASSET) {
            console.log("execute action SWAP_USDPLUS_TO_ASSET");
            WethUsdcLibrary._swapUsdPlusToUsdc(this, action.amount);
        } else if (action.actionType == ActionType.SWAP_ASSET_TO_USDPLUS) {
            console.log("execute action SWAP_ASSET_TO_USDPLUS");
            WethUsdcLibrary._swapUsdcToUsdPlus(this, action.amount);
        } else if (action.actionType == ActionType.SUPPLY_ASSET_TO_AAVE) {
            console.log("execute action SUPPLY_ASSET_TO_AAVE");
            WethUsdcLibrary._supplyUsdcToAave(this, action.amount);
        } else if (action.actionType == ActionType.WITHDRAW_ASSET_FROM_AAVE) {
            console.log("execute action WITHDRAW_ASSET_FROM_AAVE");
            WethUsdcLibrary._withdrawUsdcFromAave(this, action.amount);
        } else if (action.actionType == ActionType.BORROW_TOKEN_FROM_AAVE) {
            console.log("execute action BORROW_TOKEN_FROM_AAVE");
            WethUsdcLibrary._borrowWethFromAave(this, action.amount);
        } else if (action.actionType == ActionType.REPAY_TOKEN_TO_AAVE) {
            console.log("execute action REPAY_TOKEN_TO_AAVE");
            WethUsdcLibrary._repayWethToAave(this, action.amount);
        } else if (action.actionType == ActionType.SWAP_TOKEN_TO_ASSET) {
            console.log("execute action SWAP_TOKEN_TO_ASSET");
            WethUsdcLibrary._swapWethToUsdc(this, action.amount, action.slippagePercent);
        } else if (action.actionType == ActionType.SWAP_ASSET_TO_TOKEN) {
            console.log("execute action SWAP_ASSET_TO_TOKEN");
            WethUsdcLibrary._swapUsdcToWeth(this, action.amount, action.slippagePercent);
        }
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards velodrome
        uint256 gaugeBalance = gauge.balanceOf(address(this));
        if (gaugeBalance > 0) {
            address[] memory tokens = new address[](1);
            tokens[0] = address(velo);
            gauge.getReward(address(this), tokens);
        }

        // claim rewards aave
        uint256 aUsdcBalance = aUsdc.balanceOf(address(this));
        if (aUsdcBalance > 0) {
            address[] memory assets = new address[](1);
            assets[0] = address(aUsdc);
            rewardsController.claimAllRewardsToSelf(assets);
        }

        // sell rewards velo
        uint256 totalUsdc;
        uint256 veloBalance = velo.balanceOf(address(this));
        if (veloBalance > 0) {
            uint256 amountOut = VelodromeLibrary.getAmountsOut(
                router,
                address(velo),
                address(usdc),
                isStableVeloUsdc,
                veloBalance
            );

            if (amountOut > 0) {
                uint256 veloUsdc = VelodromeLibrary.swapExactTokensForTokens(
                    router,
                    address(velo),
                    address(usdc),
                    isStableVeloUsdc,
                    veloBalance,
                    amountOut * 99 / 100,
                    address(this)
                );

                totalUsdc += veloUsdc;
            }
        }

        // sell rewards op
        uint256 opBalance = op.balanceOf(address(this));
        if (opBalance > 0) {
            uint256 amountOut = VelodromeLibrary.getAmountsOut(
                router,
                address(op),
                address(usdc),
                isStableOpUsdc,
                opBalance
            );

            if (amountOut > 0) {
                uint256 opUsdc = VelodromeLibrary.swapExactTokensForTokens(
                    router,
                    address(op),
                    address(usdc),
                    isStableOpUsdc,
                    opBalance,
                    amountOut * 99 / 100,
                    address(this)
                );

                totalUsdc += opUsdc;
            }
        }

        return totalUsdc;
    }


    receive() external payable {
    }
}
