// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

import "@overnight-contracts/connectors/contracts/stuff/Cone.sol";
import "@overnight-contracts/connectors/contracts/stuff/AaveV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/Venus.sol";
import "@overnight-contracts/connectors/contracts/stuff/Dodo.sol";

import "@overnight-contracts/common/contracts/libraries/WadRayMath.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";
import "@overnight-contracts/common/contracts/libraries/AaveBorrowLibrary.sol";

import "@overnight-contracts/core/contracts/interfaces/IExchange.sol";

import "./libraries/UsdPlusWbnbLibrary.sol";
import "./libraries/EtsCalculationLibrary.sol";
import "./core/HedgeStrategy.sol";

import "hardhat/console.sol";

contract StrategyUsdPlusWbnb is HedgeStrategy, IERC721Receiver {
    using WadRayMath for uint256;
    using UsdPlusWbnbLibrary for StrategyUsdPlusWbnb;

    uint256 public constant MAX_UINT_VALUE = type(uint256).max;

    IERC20 public usdPlus;
    IERC20 public busd;
    IERC20 public wbnb;
    VenusInterface public vBusdToken;
    VenusInterface public vBnbToken;
    uint256 public busdDm;
    uint256 public wbnbDm;
    uint256 public bnbDm;
    IPriceFeed public oracleBusd;
    IPriceFeed public oracleWbnb;

    IConeRouter01 public coneRouter;
    IConePair public conePair;
    IConeVoter public coneVoter;
    IGauge public coneGauge;
    IERC20 public coneToken;
    IERC721 public veCone;
    uint public veConeId;

    IExchange public exchange;

    IDODOProxy public dodoProxy;
    address public dodoBusdWbnb;

    uint256 tokenAssetSlippagePercent;

    uint256 public liquidationThreshold;
    uint256 public healthFactor;
    uint256 public realHealthFactor;

    Maximillion public maximillion;

    struct SetupParams {
        address usdPlus;
        address busd;
        address wbnb;
        address vBusdToken;
        address vBnbToken;
        address unitroller;
        address maximillion;
        address oracleBusd;
        address oracleWbnb;
        address coneRouter;
        address conePair;
        address coneVoter;
        address coneGauge;
        address coneToken;
        address veCone;
        uint veConeId;
        address exchange;
        address dodoProxy;
        address dodoBusdWbnb;
        address dodoApprove;
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
        usdPlus = IERC20(params.usdPlus);
        busd = IERC20(params.busd);
        wbnb = IERC20(params.wbnb);
        vBusdToken = VenusInterface(params.vBusdToken);
        vBnbToken = VenusInterface(params.vBnbToken);
        busdDm = 10 ** IERC20Metadata(params.busd).decimals();
        wbnbDm = 10 ** IERC20Metadata(params.wbnb).decimals();
        bnbDm = 10 ** 18;
        oracleBusd = IPriceFeed(params.oracleBusd);
        oracleWbnb = IPriceFeed(params.oracleWbnb);

        setAsset(params.usdPlus);

        coneRouter = IConeRouter01(params.coneRouter);
        conePair = IConePair(params.conePair);
        coneVoter = IConeVoter(params.coneVoter);
        coneGauge = IGauge(params.coneGauge);
        coneToken = IERC20(params.coneToken);
        veCone = IERC721(params.veCone);
        veConeId = params.veConeId;

        exchange = IExchange(params.exchange);

        dodoProxy = IDODOProxy(params.dodoProxy);
        dodoBusdWbnb = params.dodoBusdWbnb;

        tokenAssetSlippagePercent = params.tokenAssetSlippagePercent;

        busd.approve(address(params.dodoApprove), type(uint256).max);
        wbnb.approve(address(params.dodoApprove), type(uint256).max);

        usdPlus.approve(address(coneRouter), type(uint256).max);
        wbnb.approve(address(coneRouter), type(uint256).max);
        conePair.approve(address(coneRouter), type(uint256).max);
        conePair.approve(address(coneGauge), type(uint256).max);

        usdPlus.approve(address(exchange), type(uint256).max);
        busd.approve(address(exchange), type(uint256).max);

        Unitroller troll = Unitroller(params.unitroller);
        address[] memory vTokens = new address[](2);
        vTokens[0] = address(vBusdToken);
        vTokens[1] = address(vBnbToken);
        uint[] memory errors = troll.enterMarkets(vTokens);

        maximillion = Maximillion(params.maximillion);

        liquidationThreshold = params.liquidationThreshold * 10 ** 15;
        healthFactor = params.healthFactor * 10 ** 15;
        realHealthFactor = 0;
    }

    // --- logic

    function _stake(uint256 _amount) internal override {
        calcDeltas(Method.STAKE, _amount);
    }

    function _unstake(
        uint256 _amount
    ) internal override returns (uint256) {
        calcDeltas(Method.UNSTAKE, _amount);
        return _amount;
    }

    function balances() external view override returns (BalanceItem[] memory){

        Liquidity memory liq = currentLiquidity();
        Amounts memory amounts = currentAmounts();

        BalanceItem[] memory items = new BalanceItem[](7);
        items[0] = BalanceItem(address(wbnb), toUint256(liq.borrowToken), amounts.borrowToken, true);
        items[1] = BalanceItem(address(busd), toUint256(liq.collateralAsset), amounts.collateralAsset, false);
        items[2] = BalanceItem(address(wbnb), toUint256(liq.poolToken), amounts.poolToken, false);
        items[3] = BalanceItem(address(usdPlus), toUint256(liq.poolUsdPlus), amounts.poolUsdPlus, false);
        items[4] = BalanceItem(address(usdPlus), toUint256(liq.freeUsdPlus), amounts.freeUsdPlus, false);
        items[5] = BalanceItem(address(busd), toUint256(liq.freeAsset), amounts.freeAsset, false);
        items[6] = BalanceItem(address(wbnb), toUint256(liq.freeToken), amounts.freeToken, false);
        return items;
    }


    /**
     * NAV = sum of all tokens liquidity minus borrows.
     * @return NAV in USDC
     */
    function netAssetValue() external view override returns (uint256){
        Liquidity memory liq = currentLiquidity();
        int256 navUsd = EtsCalculationLibrary._netAssetValue(liq);
        return usdToBusd(toUint256(navUsd));
    }


    function _claimRewards(address _to) internal override returns (uint256){

        // claim rewards
        address[] memory tokens = new address[](1);
        tokens[0] = address(coneToken);
        coneGauge.getReward(address(this), tokens);

        // sell rewards
        uint256 totalUsdPlus;

        uint256 coneBalance = coneToken.balanceOf(address(this));
        coneBalance = coneBalance * 80 / 100; // -20% to save on Strategy

        if (coneBalance > 0) {
            uint256 amountOutMin = ConeLibrary.getAmountsOut(
                coneRouter,
                address(coneToken),
                address(wbnb),
                address(usdPlus),
                false,
                false,
                coneBalance
            );

            if (amountOutMin > 0) {
                uint256 coneBusd = ConeLibrary.swap(
                    coneRouter,
                    address(coneToken),
                    address(wbnb),
                    address(usdPlus),
                    false,
                    false,
                    coneBalance,
                    amountOutMin * 99 / 100,
                    address(this)
                );

                totalUsdPlus += coneBusd;
            }
        }


        return totalUsdPlus;
    }


    function _balance() internal override returns (uint256) {
//        calcDeltas(Method.NOTHING, 0);
        return realHealthFactor;
    }


    function currentHealthFactor() external view override returns (uint256){
        return realHealthFactor;
    }

    /**
     * Current price Usd+/Wmatic in dyst pool in USD/USD in e+2
     */
    function priceInDystUsdpMaticPool() internal view returns (uint256){
        // on another pools tokens order may be another and calc price in pool should changed
        // token 0 - wmatic
        // token 1 - usdPlus
        (uint256 reserveWmatic, uint256 reserveUsdPlus,) = conePair.getReserves();
        uint256 reserveWmaticUsd = wbnbToUsd(reserveWmatic);
        uint256 reserveUsdPlusUsd = busdToUsd(reserveUsdPlus * 10 ** 12);

        // console.log("----------------- priceInDystUsdpMaticPool()");
        // console.log("reserveWmatic       ", reserveWmatic);
        // console.log("reserveWmaticUsd    ", reserveWmaticUsd);
        // console.log("reserveUsdPlus      ", reserveUsdPlus);
        // console.log("reserveUsdPlusUsd   ", reserveUsdPlusUsd);
        // console.log("-----------------");
        // 10^8 because of 10^6 plus additional 2 digits to be comparable to USD price from oracles
        return reserveUsdPlusUsd * 10 ** 8 / reserveWmaticUsd;

    }


    function currentAmounts() public view returns (Amounts memory){

        (uint256 poolToken,  uint256 poolUsdPlus) = this._getLiquidity();

        uint256 aaveCollateralUsd = busdToUsd(vBusdToken.balanceOf(address(this)) * vBusdToken.exchangeRateStored() / 1e18);
        uint256 aaveBorrowUsd = wbnbToUsd(vBnbToken.borrowBalanceStored(address(this)));

        uint256 aaveBorrowAmount = AaveBorrowLibrary.convertUsdToTokenAmount(aaveBorrowUsd, wbnbDm, uint256(oracleWbnb.latestAnswer()));
        uint256 aaveCollateralAmount = AaveBorrowLibrary.convertUsdToTokenAmount(aaveCollateralUsd, busdDm, uint256(oracleBusd.latestAnswer()));

        return Amounts(
            aaveCollateralAmount,
            aaveBorrowAmount,
            poolToken,
            poolUsdPlus,
            usdPlus.balanceOf(address(this)),
            busd.balanceOf(address(this)),
            wbnb.balanceOf(address(this))
        );
    }


    /**
     * Get current liquidity in USD e6
     */
    function currentLiquidity() public view returns (Liquidity memory){

        // in pool liquidity
        (uint256 poolToken,  uint256 poolUsdPlus) = this._getLiquidity();
        uint256 poolTokenUsd = wbnbToUsd(poolToken);
        uint256 poolUsdPlusUsd = busdToUsd(poolUsdPlus * 10 ** 12);

        // liquidity from AAVE E6+2
        uint256 aaveCollateralUsd = busdToUsd(vBusdToken.balanceOf(address(this)) * vBusdToken.exchangeRateStored() / 1e18);
        uint256 aaveBorrowUsd = wbnbToUsd(vBnbToken.borrowBalanceStored(address(this)));

        // free tokens on contract
        uint256 usdPlusBalanceUsd = busdToUsd(usdPlus.balanceOf(address(this)) * 10 ** 12);
        uint256 busdBalanceUsd = busdToUsd(busd.balanceOf(address(this)));
        uint256 wbnbBalanceUsd = wbnbToUsd(wbnb.balanceOf(address(this)));


        console.log("----------------- currentLiquidity()");
        console.log("poolToken        ", poolToken);
        console.log("poolTokenUsd     ", poolTokenUsd);
        console.log("poolUsdPlus       ", poolUsdPlus);
        console.log("poolUsdPlusUsd    ", poolUsdPlusUsd);
        console.log("aaveCollateralUsd ", aaveCollateralUsd);
        console.log("aaveBorrowUsd     ", aaveBorrowUsd);
        console.log("wbnbBalanceUsd     ", wbnbBalanceUsd);
        console.log("usdPlusBalanceUsd ", usdPlusBalanceUsd);
        console.log("busdBalanceUsd    ", busdBalanceUsd);
        console.log("-----------------");

        //TODO: rename vars
        return Liquidity(
            toInt256(aaveCollateralUsd),
            toInt256(aaveBorrowUsd),
            toInt256(poolTokenUsd),
            toInt256(poolUsdPlusUsd),
            toInt256(usdPlusBalanceUsd),
            toInt256(busdBalanceUsd),
            toInt256(wbnbBalanceUsd)
        );
    }

    function liquidityToActions(CalcContext2 memory calcContext2) view public returns (Action2[] memory, uint256){
        (Action[] memory actions, uint256 code) = EtsCalculationLibrary.liquidityToActions(calcContext2);
        Action2[] memory actions2 = new Action2[](actions.length);
        for(uint256 i=0; i < actions.length; i++) {
            actions2[i].amount = actions[i].amount;
            actions2[i].actionType = uint(actions[i].actionType);
        }
        return (actions2, code);
    }

    // /**
    //  * @param amount  - USDC amount in e6
    //  */
    function calcDeltas(Method method, uint256 amount) internal {

        Liquidity memory liq = currentLiquidity();
        int256 K1 = toInt256(1e18 * healthFactor / liquidationThreshold);
        // price in e8 K2 should be in e18 so up by 1e10
        int256 K2 = toInt256(1e10 * priceInDystUsdpMaticPool());
        int256 retAmount;
        if (method == Method.UNSTAKE) {
            int256 navUsd = EtsCalculationLibrary._netAssetValue(liq);
            int256 amountUsd = toInt256(busdToUsd(amount * 10 ** 12));
            require(navUsd >= amountUsd, "Not enough NAV for UNSTAKE");
            // for unstake make deficit as amount
            retAmount = - amountUsd;
        }

        (Action[] memory actions, uint256 code) = EtsCalculationLibrary.liquidityToActions(CalcContext2(K1, K2, retAmount, liq, tokenAssetSlippagePercent));

        runActions(actions);

        liq = currentLiquidity();
        realHealthFactor = toUint256(liq.collateralAsset) * liquidationThreshold / toUint256(liq.borrowToken);

    }

    function runActions(Action[] memory actions) internal  {

        console.log("--------- execute actions");
        for (uint j; j < actions.length; j++) {
            console.log(j, uint(actions[j].actionType), actions[j].amount);
            executeAction(actions[j]);
        }
        console.log("---------");

    }

    function executeAction(Action memory action) internal {
        if (action.actionType == ActionType.ADD_LIQUIDITY) {
            console.log("execute action ADD_LIQUIDITY");
            UsdPlusWbnbLibrary._addLiquidity(this, action.amount);
        } else if (action.actionType == ActionType.REMOVE_LIQUIDITY) {
            console.log("execute action REMOVE_LIQUIDITY");
            UsdPlusWbnbLibrary._removeLiquidity(this, action.amount);
        } else if (action.actionType == ActionType.SWAP_USDPLUS_TO_ASSET) {
            console.log("execute action SWAP_USDPLUS_TO_ASSET");
            UsdPlusWbnbLibrary._swapUspPlusToBusd(this, action.amount);
        } else if (action.actionType == ActionType.SWAP_ASSET_TO_USDPLUS) {
            console.log("execute action SWAP_ASSET_TO_USDPLUS");
            UsdPlusWbnbLibrary._swapBusdToUsdPlus(this, action.amount);
        } else if (action.actionType == ActionType.SUPPLY_ASSET_TO_AAVE) {
            console.log("execute action SUPPLY_ASSET_TO_AAVE");
            UsdPlusWbnbLibrary._supplyBusdToVenus(this, action.amount);
        } else if (action.actionType == ActionType.WITHDRAW_ASSET_FROM_AAVE) {
            console.log("execute action WITHDRAW_ASSET_FROM_AAVE");
            UsdPlusWbnbLibrary._withdrawBusdFromVenus(this, action.amount);
        } else if (action.actionType == ActionType.BORROW_TOKEN_FROM_AAVE) {
            console.log("execute action BORROW_TOKEN_FROM_AAVE");
            UsdPlusWbnbLibrary._borrowWbnbFromVenus(this, action.amount);
        } else if (action.actionType == ActionType.REPAY_TOKEN_TO_AAVE) {
            console.log("execute action REPAY_TOKEN_TO_AAVE");
            UsdPlusWbnbLibrary._repayWbnbToVenus(this, action.amount);
        } else if (action.actionType == ActionType.SWAP_TOKEN_TO_ASSET) {
            console.log("execute action SWAP_TOKEN_TO_ASSET");
            UsdPlusWbnbLibrary._swapTokenToAsset(this, action.amount, action.slippagePercent);
        } else if (action.actionType == ActionType.SWAP_ASSET_TO_TOKEN) {
            console.log("execute action SWAP_ASSET_TO_TOKEN");
            UsdPlusWbnbLibrary._swapAssetToToken(this, action.amount, action.slippagePercent);
        }
    }

    function toInt256(uint256 value) internal pure returns (int256) {
        // Note: Unsafe cast below is okay because `type(int256).max` is guaranteed to be positive
        require(value <= uint256(type(int256).max), "SafeCast: value doesn't fit in an int256");
        return int256(value);
    }

    function toUint256(int256 value) internal pure returns (uint256) {
        require(value >= 0, "SafeCast: value must be positive");
        return uint256(value);
    }

    /**
 * Get USD equivalent in e6
 * @param amount WMATIC tokens amount
     */
    function wbnbToUsd(uint256 amount) public view returns (uint256){
        // X / 100 because converting return e6+2 as oracle price but need to remove additional +2
        return AaveBorrowLibrary.convertTokenAmountToUsd(
            amount,
            bnbDm,
            uint256(oracleWbnb.latestAnswer())
        ) / 100;
    }

    /**
     * Get WMATIC equivalent from USD liquidity
     * @param liquidity USD liquidity in e6
     */
    function usdToWbnb(uint256 liquidity) public view returns (uint256){
        // liquidity * 100 => because need e6+2 for converting but liq in e6
        return AaveBorrowLibrary.convertUsdToTokenAmount(
            liquidity * 100,
            bnbDm,
            uint256(oracleWbnb.latestAnswer())
        );
    }

    /**
     * Get USD equivalent in e6
     * @param amount USDC tokens amount
     */
    function busdToUsd(uint256 amount) public view returns (uint256){
        // X / 100 because converting return e6+2 as oracle price but need to remove additional +2
        return AaveBorrowLibrary.convertTokenAmountToUsd(
            amount,
            busdDm,
            uint256(oracleBusd.latestAnswer())
        ) / 100;
    }

    /**
     * Get USDC equivalent from USD liquidity
     * @param liquidity USD liquidity in e6
     */
    function usdToBusd(uint256 liquidity) public view returns (uint256){
        // liquidity * 100 => because need e6+2 for converting but liq in e6
        return AaveBorrowLibrary.convertUsdToTokenAmount(
            liquidity * 100,
            busdDm,
            uint256(oracleBusd.latestAnswer())
        );
    }


    function vote(address[] calldata _poolVote, int256[] calldata _weights) external onlyAdmin {
        coneVoter.vote(veConeId, _poolVote, _weights);
    }

    /// @notice Used for ERC721 safeTransferFrom
    function onERC721Received(address, address, uint256, bytes memory)
    public
    virtual
    override
    returns (bytes4)
    {
        return this.onERC721Received.selector;
    }

    receive() external payable {
    }
}
