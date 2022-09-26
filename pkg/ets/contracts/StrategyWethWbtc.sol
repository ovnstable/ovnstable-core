// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/AaveV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/Beethovenx.sol";
import "@overnight-contracts/connectors/contracts/stuff/Velodrome.sol";

import "@overnight-contracts/common/contracts/libraries/WadRayMath.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "./libraries/WethWbtcLibrary.sol";
import "./core/HedgeStrategy.sol";
import "./control/ControlWethWbtc.sol";

import "hardhat/console.sol";

contract StrategyWethWbtc is HedgeStrategy {
    using WadRayMath for uint256;
    using WethWbtcLibrary for StrategyWethWbtc;
    using TickMath for int24;


    uint256 public constant INTEREST_RATE_MODE = 2;
    uint16 public constant REFERRAL_CODE = 0;
    uint256 public constant MAX_UINT_VALUE = type(uint256).max;

    ControlWethWbtc public control;
    
    IERC20 public weth;
    IERC20 public wbtc;

    uint256 public wethDm;
    uint256 public wbtcDm;
    
    IPoolAddressesProvider public aavePoolAddressesProvider;
    IPriceFeed public oracleWeth;
    IPriceFeed public oracleWbtc;

    uint256 public tokenAssetSlippagePercent;
    uint256 public liquidationThreshold;
    uint256 public healthFactor;
    uint256 public realHealthFactor;

    IRewardsController public rewardsController;

    IERC20 public aWbtc;
    IERC20 public op;

    bool public isStableVeloWbtc;
    bool public isStableOpWbtc;

    INonfungiblePositionManager public nonfungiblePositionManager;
    IUniswapV3Pool public pool;
    uint24 public poolFee0;
    uint256 public tokenId;
    int24 public lowerTick;
    int24 public upperTick;
    uint256 public lowerPercent;
    uint256 public upperPercent;

    IVault public beethovenxVault;
    bytes32 public poolIdWethWbtc;


    struct SetupParams {
        address control;
        address weth;
        address wbtc;
        address nonfungiblePositionManager;
        address uniswapV3Pool;
        uint256 lowerPercent;
        uint256 upperPercent;
        uint24 poolFee0;
        address aavePoolAddressesProvider;
        uint256 tokenAssetSlippagePercent;
        uint256 liquidationThreshold;
        uint256 healthFactor;
        address rewardsController;
        address aWbtc;
        address op;
        bool isStableVeloWbtc;
        bool isStableOpWbtc;
        address beethovenxVault;
        bytes32 poolIdWethWbtc;
    }

    IRouter public veloRouter;


    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }

    // --- setters

    function setParams(SetupParams calldata params) external onlyAdmin {

        control = ControlWethWbtc(params.control);

        weth = IERC20(params.weth);
        wbtc = IERC20(params.wbtc);

        wethDm = 10 ** IERC20Metadata(params.weth).decimals();
        wbtcDm = 10 ** IERC20Metadata(params.wbtc).decimals();

        poolFee0 = params.poolFee0;

        aavePoolAddressesProvider = IPoolAddressesProvider(params.aavePoolAddressesProvider);
        IAaveOracle priceOracleGetter = IAaveOracle(aavePoolAddressesProvider.getPriceOracle());
        oracleWeth = IPriceFeed(priceOracleGetter.getSourceOfAsset(params.weth));
        oracleWbtc = IPriceFeed(priceOracleGetter.getSourceOfAsset(params.wbtc));

        tokenAssetSlippagePercent = params.tokenAssetSlippagePercent;
        liquidationThreshold = params.liquidationThreshold * 10 ** 15;
        healthFactor = params.healthFactor * 10 ** 15;
        realHealthFactor = 0;

        rewardsController = IRewardsController(params.rewardsController);

        aWbtc = IERC20(params.aWbtc);
        op = IERC20(params.op);

        isStableVeloWbtc = params.isStableVeloWbtc;
        isStableOpWbtc = params.isStableOpWbtc;

        setAsset(params.wbtc);

        pool = IUniswapV3Pool(params.uniswapV3Pool);
        nonfungiblePositionManager = INonfungiblePositionManager(params.nonfungiblePositionManager);

        lowerPercent = params.lowerPercent;
        upperPercent = params.upperPercent;

        //calcTicksByPercents();
        lowerTick = -260580;
        upperTick = -254400;

        // lowerTick = -260599;
        // upperTick = -254409;

        
        beethovenxVault = IVault(params.beethovenxVault);
        poolIdWethWbtc = params.poolIdWethWbtc;
        veloRouter = IRouter(0x9c12939390052919aF3155f41Bf4160Fd3666A6f);

        if (address(control) != address(0)) {
            revokeRole(CONTROL_ROLE, address(control));
        }
        grantRole(CONTROL_ROLE, address(control));
        control.setStrategy(payable(this));
    }

    function setTokenId(uint256 newTokenId) external {
        tokenId = newTokenId;
    }

    function calcTicksByPercents() public {

        if (lowerPercent == 0 && upperPercent == 0) {
            lowerTick = -887270;
            upperTick = -233040;
            console.log("lowerTick", uint24(-lowerTick));
            console.log("upperTick", uint24(upperTick));
            return;
        }

        (uint160 sqrtRatioX96,,,,,,) = pool.slot0();
        console.log("sqrtRatioX96", sqrtRatioX96);
        uint256 price = getPriceBySqrtRatio(sqrtRatioX96);
        console.log("price", price);
        uint256 lowerPrice = price * (10000 - lowerPercent) / 10000;
        console.log("lowerPrice", lowerPrice);
        uint256 upperPrice = price * (10000 + upperPercent) / 10000;
        console.log("upperPrice", upperPrice);
        uint160 lowerSqrt = uint160(sqrt(lowerPrice * 2 ** 192 / 10**18));
        console.log("lowerSqrt", lowerSqrt);
        uint160 upperSqrt = uint160(sqrt(upperPrice * 2 ** 192 / 10**18));
        console.log("upperSqrt", upperSqrt);
        lowerTick = TickMath.getTickAtSqrtRatio(lowerSqrt);
        console.log("lowerTick", uint24(-lowerTick));
        upperTick = TickMath.getTickAtSqrtRatio(upperSqrt);
        console.log("upperTick", uint24(-upperTick));
    }

    function getPriceBySqrtRatio(uint160 sqrtRatio) public returns (uint256) {
        uint256 price = FullMath.mulDiv(sqrtRatio * 10**10, sqrtRatio * 10**8, 2 ** (96+96));
        return price;
    }

    function getPriceByTick(int24 tick) public returns (uint256) {
        uint160 sqrtRatio = TickMath.getSqrtRatioAtTick(tick);
        uint256 price = FullMath.mulDiv(sqrtRatio * 10**10, sqrtRatio * 10**8, 2 ** (96+96));
        return price;
    }

    function sqrt(uint256 x) internal pure returns (uint256 y) {
        uint256 z = x / 2 + 1;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    function getPoolPrice(int24 lowerTick, int24 upperTick, uint160 sqrtRatio) public returns (uint256) {
        uint256 sa = sqrt(getPriceByTick(lowerTick));
        uint256 sb = sqrt(getPriceByTick(upperTick));
        uint256 sp = sqrt(getPriceBySqrtRatio(sqrtRatio));
        
        uint256 result = (sp * sb * (sp - sa) * 10**10) / (sb - sp);
        return result;
    }

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

    function _balancePosition() internal override {
        
    }

    function executeAction(Action memory action) external {
        if (action.actionType == ActionType.ADD_LIQUIDITY) {
            console.log("execute action ADD_LIQUIDITY");
            WethWbtcLibrary._addLiquidity(this, action.amount);
        } else if (action.actionType == ActionType.REMOVE_LIQUIDITY) {
            console.log("execute action REMOVE_LIQUIDITY");
            WethWbtcLibrary._removeLiquidity(this, action.amount);
        } else if (action.actionType == ActionType.SUPPLY_ASSET_TO_AAVE) {
            console.log("execute action SUPPLY_ASSET_TO_AAVE");
            WethWbtcLibrary._supplyWbtcToAave(this, action.amount);
        } else if (action.actionType == ActionType.WITHDRAW_ASSET_FROM_AAVE) {
            console.log("execute action WITHDRAW_ASSET_FROM_AAVE");
            WethWbtcLibrary._withdrawWbtcFromAave(this, action.amount);
        } else if (action.actionType == ActionType.BORROW_TOKEN_FROM_AAVE) {
            console.log("execute action BORROW_TOKEN_FROM_AAVE");
            WethWbtcLibrary._borrowWethFromAave(this, action.amount);
        } else if (action.actionType == ActionType.REPAY_TOKEN_TO_AAVE) {
            console.log("execute action REPAY_TOKEN_TO_AAVE");
            WethWbtcLibrary._repayWethToAave(this, action.amount);
        } else if (action.actionType == ActionType.SWAP_TOKEN_TO_ASSET) {
            console.log("execute action SWAP_TOKEN_TO_ASSET");
            WethWbtcLibrary._swapWethToWbtc(this, action.amount, action.slippagePercent);
        } else if (action.actionType == ActionType.SWAP_ASSET_TO_TOKEN) {
            console.log("execute action SWAP_ASSET_TO_TOKEN");
            WethWbtcLibrary._swapWbtcToWeth(this, action.amount, action.slippagePercent);
        }
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        INonfungiblePositionManager.CollectParams memory collectParam = INonfungiblePositionManager.CollectParams(tokenId, address(this), type(uint128).max, type(uint128).max);
        nonfungiblePositionManager.collect(collectParam);
        
        // claim rewards aave
        uint256 aUsdcBalance = aWbtc.balanceOf(address(this));
        if (aUsdcBalance > 0) {
            address[] memory assets = new address[](1);
            assets[0] = address(aWbtc);
            rewardsController.claimAllRewardsToSelf(assets);
        }
       
        VelodromeLibrary.swapExactTokensForTokens(
            veloRouter,
            address(op),
            0x7F5c764cBc14f9669B88837ca1490cCa17c31607,
            address(wbtc),
            true,
            false,
            op.balanceOf(address(this)),
            0,
            address(this)
        );

        BeethovenExchange.swap(
            beethovenxVault,
            poolIdWethWbtc,
            IVault.SwapKind.GIVEN_IN,
            IAsset(address(weth)),
            IAsset(address(wbtc)),
            address(this),
            address(this),
            weth.balanceOf(address(this)),
            0
        );

        return wbtc.balanceOf(address(this));
    }


    receive() external payable {
    }
}
