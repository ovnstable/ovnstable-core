// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/connectors/contracts/stuff/MeshSwap.sol";
import "@overnight-contracts/connectors/contracts/stuff/AaveV3.sol";

import "@overnight-contracts/common/contracts/libraries/WadRayMath.sol";

import "@overnight-contracts/core/contracts/interfaces/IExchange.sol";

import "./libraries/WmaticUsdcLibrary.sol";
import "./core/HedgeStrategy.sol";
import "./control/ControlWmaticUsdc.sol";

import "hardhat/console.sol";

contract StrategyWmaticUsdc is HedgeStrategy {
    using WadRayMath for uint256;
    using WmaticUsdcLibrary for StrategyWmaticUsdc;


    uint256 public constant INTEREST_RATE_MODE = 2;
    uint16 public constant REFERRAL_CODE = 0;
    uint256 public constant MAX_UINT_VALUE = type(uint256).max;

    IExchange public exchange;
    ControlWmaticUsdc public control;
    
    IERC20 public usdPlus;
    IERC20 public wmatic;
    IERC20 public usdc;
    IERC20 public meshToken;

    uint256 public wmaticDm;
    uint256 public usdcDm;
    
    IMeshSwapLP public meshSwapWmaticUsdc;
    IMeshSwapRouter public meshSwapRouter;

    ISwapRouter public uniswapV3Router;
    uint24 public poolFeeMaticUsdc;
    
    IPoolAddressesProvider public aavePoolAddressesProvider;
    IPriceFeed public oracleWmatic;
    IPriceFeed public oracleUsdc;

    uint256 public tokenAssetSlippagePercent;
    uint256 public liquidationThreshold;
    uint256 public healthFactor;
    uint256 public realHealthFactor;


    struct SetupParams {
        address exchange;
        address control;
        address usdPlus;
        address wmatic;
        address usdc;
        address meshToken;
        address meshSwapWmaticUsdc;
        address meshSwapRouter;
        address uniswapV3Router;
        uint24 poolFeeMaticUsdc;
        address aavePoolAddressesProvider;
        uint256 tokenAssetSlippagePercent;
        uint256 liquidationThreshold;
        uint256 healthFactor;
    }


    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }

    // --- setters

    function setParams(SetupParams calldata params) external onlyAdmin {
        exchange = IExchange(params.exchange);
        control = ControlWmaticUsdc(params.control);

        usdPlus = IERC20(params.usdPlus);
        wmatic = IERC20(params.wmatic);
        usdc = IERC20(params.usdc);
        meshToken = IERC20(params.meshToken);

        wmaticDm = 10 ** IERC20Metadata(params.wmatic).decimals();
        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();

        meshSwapWmaticUsdc = IMeshSwapLP(params.meshSwapWmaticUsdc);
        meshSwapRouter = IMeshSwapRouter(params.meshSwapRouter);

        uniswapV3Router = ISwapRouter(params.uniswapV3Router);
        poolFeeMaticUsdc = params.poolFeeMaticUsdc;

        aavePoolAddressesProvider = IPoolAddressesProvider(params.aavePoolAddressesProvider);
        IAaveOracle priceOracleGetter = IAaveOracle(aavePoolAddressesProvider.getPriceOracle());
        oracleWmatic = IPriceFeed(priceOracleGetter.getSourceOfAsset(params.wmatic));
        oracleUsdc = IPriceFeed(priceOracleGetter.getSourceOfAsset(params.usdc));

        tokenAssetSlippagePercent = params.tokenAssetSlippagePercent;
        liquidationThreshold = params.liquidationThreshold * 10 ** 15;
        healthFactor = params.healthFactor * 10 ** 15;
        realHealthFactor = 0;

        setAsset(params.usdPlus);

        wmatic.approve(address(meshSwapRouter), MAX_UINT_VALUE);
        usdc.approve(address(meshSwapRouter), MAX_UINT_VALUE);
        meshSwapWmaticUsdc.approve(address(meshSwapRouter), MAX_UINT_VALUE);

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
        control.calcDeltas(Method.UNSTAKE, _amount);
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

    function executeAction(Action memory action) external {
        if (action.actionType == ActionType.ADD_LIQUIDITY) {
            console.log("execute action ADD_LIQUIDITY");
            WmaticUsdcLibrary._addLiquidity(this, action.amount);
        } else if (action.actionType == ActionType.REMOVE_LIQUIDITY) {
            console.log("execute action REMOVE_LIQUIDITY");
            WmaticUsdcLibrary._removeLiquidity(this, action.amount);
        } else if (action.actionType == ActionType.SWAP_USDPLUS_TO_ASSET) {
            console.log("execute action SWAP_USDPLUS_TO_ASSET");
            WmaticUsdcLibrary._swapUsdPlusToUsdc(this, action.amount);
        } else if (action.actionType == ActionType.SWAP_ASSET_TO_USDPLUS) {
            console.log("execute action SWAP_ASSET_TO_USDPLUS");
            WmaticUsdcLibrary._swapUsdcToUsdPlus(this, action.amount);
        } else if (action.actionType == ActionType.SUPPLY_ASSET_TO_AAVE) {
            console.log("execute action SUPPLY_ASSET_TO_AAVE");
            WmaticUsdcLibrary._supplyUsdcToAave(this, action.amount);
        } else if (action.actionType == ActionType.WITHDRAW_ASSET_FROM_AAVE) {
            console.log("execute action WITHDRAW_ASSET_FROM_AAVE");
            WmaticUsdcLibrary._withdrawUsdcFromAave(this, action.amount);
        } else if (action.actionType == ActionType.BORROW_TOKEN_FROM_AAVE) {
            console.log("execute action BORROW_TOKEN_FROM_AAVE");
            WmaticUsdcLibrary._borrowWmaticFromAave(this, action.amount);
        } else if (action.actionType == ActionType.REPAY_TOKEN_TO_AAVE) {
            console.log("execute action REPAY_TOKEN_TO_AAVE");
            WmaticUsdcLibrary._repayWmaticToAave(this, action.amount);
        } else if (action.actionType == ActionType.SWAP_TOKEN_TO_ASSET) {
            console.log("execute action SWAP_TOKEN_TO_ASSET");
            WmaticUsdcLibrary._swapWmaticToUsdc(this, action.amount, action.slippagePercent);
        } else if (action.actionType == ActionType.SWAP_ASSET_TO_TOKEN) {
            console.log("execute action SWAP_ASSET_TO_TOKEN");
            WmaticUsdcLibrary._swapUsdcToWmatic(this, action.amount, action.slippagePercent);
        }
    }

    function _claimRewards(address _to) internal override returns (uint256){

        // claim rewards
        if (meshSwapWmaticUsdc.balanceOf(address(this)) > 0) {
            meshSwapWmaticUsdc.claimReward();
        }

        // sell rewards
        uint256 totalUsdc;

        uint256 meshBalance = meshToken.balanceOf(address(this));
        if (meshBalance > 0) {
            uint256 amountOut = MeshSwapLibrary.getAmountsOut(
                meshSwapRouter,
                address(meshToken),
                address(usdc),
                meshBalance
            );

            if (amountOut > 0) {
                uint256 meshUsdc = MeshSwapLibrary.swapExactTokensForTokens(
                    meshSwapRouter,
                    address(meshToken),
                    address(usdc),
                    meshBalance,
                    amountOut * 99 / 100,
                    address(this)
                );

                totalUsdc += meshUsdc;
            }
        }

        return totalUsdc;
    }

    receive() external payable {
    }
}
