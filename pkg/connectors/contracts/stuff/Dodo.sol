// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@overnight-contracts/common/contracts/libraries/SafeMath.sol";
import "@overnight-contracts/common/contracts/libraries/DecimalMath.sol";

interface IDODOMine {

    function balanceOf(address user) external view returns (uint256);

    function deposit(uint256 _amount) external;

    function withdraw(uint256 _amount) external;

    function claimAllRewards() external;

}

interface IDODOProxy {
    function dodoSwapV1(
        address fromToken,
        address toToken,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        address[] memory dodoPairs,
        uint256 directions,
        bool,
        uint256 deadLine
    ) external payable returns (uint256 returnAmount);

    function dodoSwapV2TokenToToken(
        address fromToken,
        address toToken,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        address[] memory dodoPairs,
        uint256 directions,
        bool isIncentive,
        uint256 deadLine
    ) external returns (uint256 returnAmount);
}

interface IDODOV1 {
    function init(
        address owner,
        address supervisor,
        address maintainer,
        address baseToken,
        address quoteToken,
        address oracle,
        uint256 lpFeeRate,
        uint256 mtFeeRate,
        uint256 k,
        uint256 gasPriceLimit
    ) external;

    function transferOwnership(address newOwner) external;

    function claimOwnership() external;

    function sellBaseToken(
        uint256 amount,
        uint256 minReceiveQuote,
        bytes calldata data
    ) external returns (uint256);

    function buyBaseToken(
        uint256 amount,
        uint256 maxPayQuote,
        bytes calldata data
    ) external returns (uint256);

    function querySellBaseToken(uint256 amount) external view returns (uint256 receiveQuote);

    function queryBuyBaseToken(uint256 amount) external view returns (uint256 payQuote);

    function getExpectedTarget() external view returns (uint256 baseTarget, uint256 quoteTarget);

    function depositBaseTo(address to, uint256 amount) external returns (uint256);

    function withdrawBase(uint256 amount) external returns (uint256);

    function withdrawAllBase() external returns (uint256);

    function depositQuoteTo(address to, uint256 amount) external returns (uint256);

    function withdrawQuote(uint256 amount) external returns (uint256);

    function withdrawAllQuote() external returns (uint256);

    function _BASE_CAPITAL_TOKEN_() external view returns (address);

    function _QUOTE_CAPITAL_TOKEN_() external view returns (address);

    function _BASE_TOKEN_() external returns (address);

    function _QUOTE_TOKEN_() external returns (address);

    function _K_() external view returns (uint256);

    function _R_STATUS_() external view returns (RStatus);

    function _TARGET_BASE_TOKEN_AMOUNT_() external view returns (uint256);

    function _TARGET_QUOTE_TOKEN_AMOUNT_() external view returns (uint256);

    function _BASE_BALANCE_() external view returns (uint256);

    function _QUOTE_BALANCE_() external view returns (uint256);

    function getOraclePrice() external view returns (uint256);

    function getWithdrawBasePenalty(uint256 amountLp) external view returns (uint256);

    enum RStatus {ONE, ABOVE_ONE, BELOW_ONE}

}

interface IDODOV1Helper {
    function querySellQuoteToken(
        address dodoV1Pool,
        uint256 quoteAmount
    ) external view returns (uint256 receivedBaseAmount);

    function querySellBaseToken(
        address dodoV1Pool,
        uint256 baseAmount
    ) external view returns (uint256 receivedQuoteAmount);
}

interface IDODOV2 {
    function querySellBase(
        address trader,
        uint256 payBaseAmount
    ) external view returns (uint256 receiveQuoteAmount, uint256 mtFee);

    function querySellQuote(
        address trader,
        uint256 payQuoteAmount
    ) external view returns (uint256 receiveBaseAmount, uint256 mtFee);
}


library StrategyDodoLibrary {
    using SafeMath for uint256;


    struct Context {
        IDODOV1 dodo;
        uint256 amountOut;
        uint256 fairAmount;
        uint256 targetBase;
        uint256 dd;
        uint256 a;
        uint256 b;
        uint256 c;
        uint256 d;
        uint256 e;
        uint256 g;
        uint256 h;
        uint256 i;
    }

    function _getAmountIn(uint256 amountOut, IDODOV1 dodo) internal view returns (uint256) {
        if (dodo._R_STATUS_() != IDODOV1.RStatus.ABOVE_ONE) {
            return amountOut;
        }

        Context memory ctx;
        ctx.dodo = dodo;
        ctx.amountOut = amountOut;

        ctx.fairAmount = _fairAmount(ctx);
        ctx.targetBase = _solveQuadraticFunctionForTargetCeil(ctx);

        ctx.dd = getDD(ctx);
        ctx.a = getA(ctx);
        ctx.b = getB(ctx);
        ctx.c = getC(ctx);
        ctx.d = getD(ctx);
        ctx.e = getE(ctx);
        ctx.g = getG(ctx);
        ctx.h = getH(ctx);
        ctx.i = getI(ctx);

        uint256 underSqrt = ctx.a.add(ctx.c).add(ctx.d).add(ctx.e).sub(ctx.b);
        uint256 sqrt = underSqrt.sqrt();
        uint256 t1 = ctx.g.add(sqrt);
        uint256 t2 = t1.mul(1e18).div(ctx.i);
        uint256 res = ctx.h.sub(t2);

        return res;
    }


    function _fairAmount(Context memory ctx) internal view returns (uint256){
        uint256 spareQuote = ctx.dodo._QUOTE_BALANCE_().sub(ctx.dodo._TARGET_QUOTE_TOKEN_AMOUNT_());
        uint256 price = ctx.dodo.getOraclePrice();
        uint256 fairAmount = DecimalMath.divFloor(spareQuote, price);
        return fairAmount;
    }

    function getDD(Context memory ctx) internal view returns (uint256){
        return ctx.dodo._BASE_BALANCE_().mul(2).sub(ctx.amountOut);
    }

    function getA(Context memory ctx) internal view returns (uint256){
        return ctx.fairAmount.mul(ctx.fairAmount).add(ctx.targetBase.mul(ctx.targetBase));
    }

    function getB(Context memory ctx) internal view returns (uint256){

        uint256 t1 = ctx.fairAmount.mul(ctx.dodo._K_()).mul(2).div(1e18);
        uint256 t2 = ctx.dd.add(ctx.fairAmount).add(t1);
        uint256 t3 = t2.mul(ctx.targetBase).mul(2);

        return t3;
    }

    function getC(Context memory ctx) internal view returns (uint256){
        return ctx.dd.mul(ctx.fairAmount).mul(2);
    }

    function getD(Context memory ctx) internal view returns (uint256){
        return ctx.c.mul(ctx.dodo._K_()).mul(2).div(1e18);
    }

    function getE(Context memory ctx) internal view returns (uint256){
        return ctx.dd.mul(ctx.dd);
    }

    function getG(Context memory ctx) internal view returns (uint256){
        return ctx.targetBase.add(ctx.fairAmount).sub(ctx.dd);
    }

    function getH(Context memory ctx) internal view returns (uint256){
        return ctx.targetBase.add(ctx.dodo._BASE_BALANCE_()).sub(ctx.dd);
    }

    function getI(Context memory ctx) internal view returns (uint256){
        return ctx.dodo._K_().mul(2).add(uint256(2).mul(1e18));
    }


    function _solveQuadraticFunctionForTargetCeil(
        Context memory ctx
    ) internal view returns (uint256) {
        uint256 V1 = ctx.dodo._BASE_BALANCE_();
        uint256 k = ctx.dodo._K_();

        // V0 = V1+V1*(sqrt-1)/2k
        uint256 sqrt = DecimalMath.divCeil(DecimalMath.mulCeil(k, ctx.fairAmount).mul(4), V1);
        sqrt = sqrt.add(DecimalMath.ONE).mul(DecimalMath.ONE).sqrt();
        uint256 premium = DecimalMath.divCeil(sqrt.sub(DecimalMath.ONE), k.mul(2));
        // V0 is greater than or equal to V1 according to the solution
        return DecimalMath.mul(V1, DecimalMath.ONE.add(premium));
    }
}


abstract contract DodoExchange {

    IDODOV1Helper private dodoV1Helper;
    IDODOProxy private dodoProxy;
    address private dodoApprove;

    function _setDodoParams(
        address _dodoV1Helper,
        address _dodoProxy,
        address _dodoApprove
    ) internal {
        dodoV1Helper = IDODOV1Helper(_dodoV1Helper);
        dodoProxy = IDODOProxy(_dodoProxy);
        dodoApprove = _dodoApprove;
    }

    /*
        The code example assumes user wanting to use the specify DODOV1 pool for swapping

        Note: Differentiate sellBaseToken or sellQuoteToken. If sellBaseToken represents 0, sellQuoteToken represents 1.
        At the same time, dodoSwapV1 supports multi-hop linear routing, so here we use 0,1
        combination to represent the multi-hop directions to save gas consumption
        For example:
            A - B - C (A - B sellBase and  B - C sellQuote)  Binary: 10, Decimal 2 (directions = 2)
            D - E - F (D - E sellQuote and E - F sellBase) Binary: 01, Decimal 1 (directions = 1)
    */
    function _useDodoSwapV1(
        address dodoV1Pool,
        address fromToken,
        address toToken,
        uint256 fromTokenAmount,
        uint256 slippage,
        uint256 directions
    ) internal returns (uint256) {

        uint256 minReturnAmount;
        if (directions == 0) {
            uint256 receivedQuoteAmount = dodoV1Helper.querySellBaseToken(dodoV1Pool, fromTokenAmount);
            minReturnAmount = receivedQuoteAmount * (100 - slippage) / 100;
        } else {
            uint256 receivedBaseAmount = dodoV1Helper.querySellQuoteToken(dodoV1Pool, fromTokenAmount);
            minReturnAmount = receivedBaseAmount * (100 - slippage) / 100;
        }
        if (minReturnAmount == 0) {
            return 0;
        }

        address[] memory dodoPairs = new address[](1); //one-hop
        dodoPairs[0] = dodoV1Pool;

        IERC20(fromToken).approve(dodoApprove, fromTokenAmount);

        return dodoProxy.dodoSwapV1(
            fromToken,
            toToken,
            fromTokenAmount,
            minReturnAmount,
            dodoPairs,
            directions,
            false,
            block.timestamp + 600
        );
    }

    /*
        The code example assumes user wanting to use the specify DODOV2 pool for swapping

        Note: Differentiate sellBaseToken or sellQuoteToken. If sellBaseToken represents 0, sellQuoteToken represents 1.
        At the same time, dodoSwapV1 supports multi-hop linear routing, so here we use 0,1
        combination to represent the multi-hop directions to save gas consumption
        For example:
            A - B - C (A - B sellBase and  B - C sellQuote)  Binary: 10, Decimal 2 (directions = 2)
            D - E - F (D - E sellQuote and E - F sellBase) Binary: 01, Decimal 1 (directions = 1)
    */
    function _useDodoSwapV2(
        address dodoV2Pool,
        address fromToken,
        address toToken,
        uint256 fromTokenAmount,
        uint256 slippage,
        uint256 directions
    ) internal returns (uint256) {

        uint256 minReturnAmount;
        if (directions == 0) {
            (uint256 receiveQuoteAmount,) = IDODOV2(dodoV2Pool).querySellBase(address(this), fromTokenAmount);
            minReturnAmount = receiveQuoteAmount * (100 - slippage) / 100;
        } else {
            (uint256 receiveBaseAmount,) = IDODOV2(dodoV2Pool).querySellQuote(address(this), fromTokenAmount);
            minReturnAmount = receiveBaseAmount * (100 - slippage) / 100;
        }
        if (minReturnAmount == 0) {
            return 0;
        }

        address[] memory dodoPairs = new address[](1); //one-hop
        dodoPairs[0] = dodoV2Pool;

        IERC20(fromToken).approve(dodoApprove, fromTokenAmount);

        return dodoProxy.dodoSwapV2TokenToToken(
            fromToken,
            toToken,
            fromTokenAmount,
            minReturnAmount,
            dodoPairs,
            directions,
            false,
            block.timestamp + 600
        );
    }

}


/// @title DODORouteProxy
/// @author DODO Breeder
/// @notice new routeProxy contract with fee rebate to manage all route. It provides three methods to swap,
/// including mixSwap, multiSwap and externalSwap. Mixswap is for linear swap, which describes one token path
/// with one pool each time. Multiswap is a simplified version about 1inch, which describes one token path
/// with several pools each time. ExternalSwap is for other routers like 0x, 1inch and paraswap. Dodo and
/// front-end users could take certain route fee rebate from each swap. Wherein dodo will get a fixed percentage,
/// and front-end users could assign any proportion through function parameters.
/// @dev dependence: DODOApprove.sol / DODOApproveProxy.sol / IDODOAdapter.sol
/// In dodo's contract system, there is only one approve entrance DODOApprove.sol. DODOApprove manages DODOApproveProxy,
/// Any contract which needs claim user's tokens must be registered in DODOApproveProxy. They used in DODORouteProxy are
/// to manage user's token, all user's token must be claimed through DODOApproveProxy and DODOApprove
/// IDODOAdapter determine the interface of adapter, in which swap happened. There are different adapters for different
/// pools. Adapter addresses are parameters contructed off chain so they are loose coupling with routeProxy.
/// adapters have two interface functions. func sellBase(address to, address pool, bytes memory moreInfo) and func sellQuote(address to, address pool, bytes memory moreInfo)

contract DODOFeeRouteProxy {

    struct PoolInfo {
        // pool swap direciton, 0 is for sellBase, 1 is for sellQuote
        uint256 direction;
        // distinct transferFrom pool(like dodoV1) and transfer pool
        // 1 is for transferFrom pool, pool call transferFrom function to get tokens from adapter
        // 2 is for transfer pool, pool determine swapAmount through balanceOf(Token) - reserve
        uint256 poolEdition;
        // pool weight, actualWeight = weight/totalWeight, totalAmount * actualWeight = amount through this pool swap
        uint256 weight;
        // pool address
        address pool;
        // pool adapter, making actual swap call in corresponding adapter
        address adapter;
        // pool adapter's Info, record addtional infos(could be zero-bytes) needed by each pool adapter
        bytes moreInfo;
    }

    // ============ Swap ============


    /// @notice Call external black box contracts to finish a swap
    /// @param approveTarget external swap approve address
    /// @param swapTarget external swap address
    /// @param feeData route fee info
    /// @param callDataConcat external swap data, toAddress need to be routeProxy
    /// specially when toToken is ETH, use WETH as external calldata's toToken
    function externalSwap(
        address fromToken,
        address toToken,
        address approveTarget,
        address swapTarget,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        bytes memory feeData,
        bytes memory callDataConcat,
        uint256 deadLine
    ) external payable returns (uint256 receiveAmount);

    /// @notice linear version, describes one token path with one pool each time
    /// @param mixAdapters adapter address array, record each pool's interrelated adapter in order
    /// @param mixPairs pool address array, record pool address of the whole route in order
    /// @param assetTo asset Address（pool or proxy）, describe pool adapter's receiver address. Specially assetTo[0] is deposit receiver before all
    /// @param directions pool directions aggregation, one bit represent one pool direction, 0 means sellBase, 1 means sellQuote
    /// @param moreInfos pool adapter's Info set, record addtional infos(could be zero-bytes) needed by each pool adapter, keeping order with adapters
    /// @param feeData route fee info, bytes decode into broker and brokerFee, determine rebate proportion, brokerFee in [0, 1e18]
    function mixSwap(
        address fromToken,
        address toToken,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        address[] memory mixAdapters,
        address[] memory mixPairs,
        address[] memory assetTo,
        uint256 directions,
        bytes[] memory moreInfos,
        bytes memory feeData,
        uint256 deadLine
    ) external payable returns (uint256 receiveAmount);

    /// @notice split version, describes one token path with several pools each time. Called one token pair with several pools "one split"
    /// @param splitNumber record pool number in one split, determine sequence(poolInfo) array subscript in transverse. Begin with 0
    /// for example, [0,1, 3], mean the first split has one(1 - 0) pool, the second split has 2 (3 - 1) pool
    /// @param midToken middle token set, record token path in order.
    /// Specially midToken[1] is WETH addresss when fromToken is ETH. Besides midToken[1] is also fromToken
    /// Specially midToken[length - 2] is WETH address and midToken[length -1 ] is ETH address when toToken is ETH. Besides midToken[length -1]
    /// is the last toToken and midToken[length - 2] is common second last middle token.
    /// @param assetFrom asset Address（pool or proxy）describe pool adapter's receiver address. Specially assetFrom[0] is deposit receiver before all
    /// @param sequence PoolInfo sequence, describe each pool's attributions, ordered by spiltNumber
    /// @param feeData route fee info, bytes decode into broker and brokerFee, determine rebate proportion, brokerFee in [0, 1e18]
    function dodoMutliSwap(
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        uint256[] memory splitNumber,
        address[] memory midToken,
        address[] memory assetFrom,
        bytes[] memory sequence,
        bytes memory feeData,
        uint256 deadLine
    ) external payable returns (uint256 receiveAmount);

}


library DodoLibrary {

    struct SingleSwapStruct {
        address dodoApprove;
        address dodoProxy;
        address fromToken;
        address toToken;
        uint256 fromTokenAmount;
        address adapter;
        address pair;
        address feeProxy;
        uint256 directions;
        bytes[] sequence;
        bytes feeData;
    }

    function singleSwap(SingleSwapStruct memory swapParams) internal returns (uint256) {

        IERC20(swapParams.fromToken).approve(swapParams.dodoApprove, swapParams.fromTokenAmount);

        address[] memory mixAdapters = new address[](1);
        mixAdapters[0] = swapParams.adapter;

        address[] memory mixPairs = new address[](1);
        mixPairs[0] = swapParams.pair;

        address[] memory assetTo = new address[](2);
        if (swapParams.directions == 0) {
            assetTo[0] = swapParams.pair;
        } else {
            assetTo[0] = swapParams.adapter;
        }
        assetTo[1] = swapParams.feeProxy;

        return DODOFeeRouteProxy(swapParams.dodoProxy).mixSwap(
            swapParams.fromToken,
            swapParams.toToken,
            swapParams.fromTokenAmount,
            1,
            mixAdapters,
            mixPairs,
            assetTo,
            swapParams.directions,
            swapParams.sequence,
            swapParams.feeData,
            block.timestamp
        );
    }

}