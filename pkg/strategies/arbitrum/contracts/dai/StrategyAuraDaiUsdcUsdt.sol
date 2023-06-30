// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Balancer.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/Aura.sol";
import "@overnight-contracts/connectors/contracts/stuff/Wombat.sol";
import "./../libraries/AuraRewardUsdcUsdtDaiLibrary.sol";

contract StrategyAuraDaiUsdcUsdt is Strategy {

    uint256 public constant MAX_UINT_VALUE = type(uint256).max;

    // --- params

    IERC20 public dai;
    IERC20 public usdc;
    IERC20 public usdt;

    IBptToken public bbamDai;
    IBptToken public bbamUsdc;
    IBptToken public bbamUsdt;
    IBptToken public bpt;

    IVault public vault;

    bytes32 public bbamDaiPoolId;
    bytes32 public bbamUsdcPoolId;
    bytes32 public bbamUsdtPoolId;
    bytes32 public poolId;

    IPriceFeed public oracleDai;
    IPriceFeed public oracleUsdc;
    IPriceFeed public oracleUsdt;

    IERC20 public auraLp;
    AuraBoosterLite public auraBoosterLite;
    AuraBaseRewardPool public auraBaseRewardPool;

    IWombatRouter public wombatRouter;
    address public wombatBasePool;

    uint256 public daiDm;
    uint256 public usdcDm;
    uint256 public usdtDm;


    // --- events

    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address dai;
        address usdc;
        address usdt;
        address bbamDai;
        address bbamUsdc;
        address bbamUsdt;
        address bpt;
        address vault;
        bytes32 bbamDaiPoolId;
        bytes32 bbamUsdcPoolId;
        bytes32 bbamUsdtPoolId;
        bytes32 poolId;
        address oracleDai;
        address oracleUsdc;
        address oracleUsdt;
        address auraLp;
        address auraBoosterLite;
        address auraBaseRewardPool;
        address wombatRouter;
        address wombatBasePool;
    }


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        dai = IERC20(params.dai);
        usdc = IERC20(params.usdc);
        usdt = IERC20(params.usdt);

        bbamDai = IBptToken(params.bbamDai);
        bbamUsdc = IBptToken(params.bbamUsdc);
        bbamUsdt = IBptToken(params.bbamUsdt);
        bpt = IBptToken(params.bpt);

        vault = IVault(params.vault);

        bbamDaiPoolId = params.bbamDaiPoolId;
        bbamUsdcPoolId = params.bbamUsdcPoolId;
        bbamUsdtPoolId = params.bbamUsdtPoolId;
        poolId = params.poolId;

        oracleDai = IPriceFeed(params.oracleDai);
        oracleUsdc = IPriceFeed(params.oracleUsdc);
        oracleUsdt = IPriceFeed(params.oracleUsdt);

        auraLp = IERC20(params.auraLp);
        auraBoosterLite = AuraBoosterLite(params.auraBoosterLite);
        auraBaseRewardPool = AuraBaseRewardPool(params.auraBaseRewardPool);

        wombatRouter = IWombatRouter(params.wombatRouter);
        wombatBasePool = params.wombatBasePool;

        daiDm = 10 ** IERC20Metadata(params.dai).decimals();
        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();
        usdtDm = 10 ** IERC20Metadata(params.usdt).decimals();

        bbamDai.approve(address(vault), MAX_UINT_VALUE);
        bbamUsdc.approve(address(vault), MAX_UINT_VALUE);
        bbamUsdt.approve(address(vault), MAX_UINT_VALUE);
        bpt.approve(address(auraBoosterLite), MAX_UINT_VALUE);

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        (uint256 amountUsdcInDai, uint256 amountUsdtInDai) = _calcAmountsToSwap(dai.balanceOf(address(this)));

        _swapDaiToTokens(amountUsdcInDai, amountUsdtInDai);

        _swapAssetToBptToken(dai, bbamDai, bbamDaiPoolId, 1e18);
        _swapAssetToBptToken(usdc, bbamUsdc, bbamUsdcPoolId, 1e30);
        _swapAssetToBptToken(usdt, bbamUsdt, bbamUsdtPoolId, 1e30);

        (IERC20[] memory tokens,,) = vault.getPoolTokens(poolId);

        IAsset[] memory assets = new IAsset[](4);
        uint256[] memory maxAmountsIn = new uint256[](4);

        // Must be without bpt fantom token
        uint256[] memory amountsIn = new uint256[](3);

        for (uint256 i; i < tokens.length; i++) {
            assets[i] = IAsset(address(tokens[i]));

            if (address(tokens[i]) == address(bbamDai)) {
                amountsIn[i] = bbamDai.balanceOf(address(this));
                maxAmountsIn[i] = MAX_UINT_VALUE;
            } else if (address(tokens[i]) == address(bbamUsdc)) {
                amountsIn[i] = bbamUsdc.balanceOf(address(this));
                maxAmountsIn[i] = MAX_UINT_VALUE;
            } else if (address(tokens[i]) == address(bbamUsdt)) {
                amountsIn[i] = bbamUsdt.balanceOf(address(this));
                maxAmountsIn[i] = MAX_UINT_VALUE;
            }
        }

        uint256 EXACT_TOKENS_IN_FOR_BPT_OUT = 1;
        uint256 minimumBPT = 1;
        bytes memory userData = abi.encode(EXACT_TOKENS_IN_FOR_BPT_OUT, amountsIn, minimumBPT);

        IVault.JoinPoolRequest memory request = IVault.JoinPoolRequest(assets, maxAmountsIn, userData, false);

        // 2. Put into Stable pool
        vault.joinPool(poolId, address(this), address(this), request);

        // 3. Put bpt tokens to Aura
        uint256 bptAmount = bpt.balanceOf(address(this));
        auraBoosterLite.deposit(2, bptAmount, true);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        _unstakeDai(_amount);

        return dai.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        if (auraLp.balanceOf(address(this)) > 0) {
            _unstakeDai(_totalValue());
        }

        return dai.balanceOf(address(this));
    }

    function _unstakeDai(uint256 amount) internal {
        (uint256 daiBptAmount, uint256 usdcBptAmount, uint256 usdtBptAmount) = _getBptAmounts(OvnMath.addBasisPoints(amount, swapSlippageBP));

        uint256 totalBpt = daiBptAmount + usdcBptAmount + usdtBptAmount;

        uint256 bptBalance = auraLp.balanceOf(address(this));
        if (totalBpt > bptBalance) {
            totalBpt = bptBalance;
        }

        auraBaseRewardPool.withdrawAndUnwrap(totalBpt, false);

        BalancerLibrary.batchSwap(
            vault,
            address(bpt),
            address(bbamDai),
            address(dai),
            poolId,
            bbamDaiPoolId,
            daiBptAmount,
            0,
            address(this)
        );

        BalancerLibrary.batchSwap(
            vault,
            address(bpt),
            address(bbamUsdc),
            address(usdc),
            poolId,
            bbamUsdcPoolId,
            usdcBptAmount,
            0,
            address(this)
        );

        if (totalBpt == bptBalance) {
            usdtBptAmount = bpt.balanceOf(address(this));
        }

        BalancerLibrary.batchSwap(
            vault,
            address(bpt),
            address(bbamUsdt),
            address(usdt),
            poolId,
            bbamUsdtPoolId,
            usdtBptAmount,
            0,
            address(this)
        );

        _swapTokensToDai();
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256){
        uint256 daiBalance = dai.balanceOf(address(this));
        uint256 usdcBalance = usdc.balanceOf(address(this));
        uint256 usdtBalance = usdt.balanceOf(address(this));

        uint256 bptAmount = auraLp.balanceOf(address(this));
        if (bptAmount > 0) {
            // total used tokens
            uint256 totalActualSupply = bpt.getActualSupply();

            (IERC20[] memory tokens, uint256[] memory balances,) = vault.getPoolTokens(poolId);

            for (uint256 i = 0; i < tokens.length; i++) {

                address token = address(tokens[i]);

                // calculate share
                uint256 amountToken = balances[i] * bptAmount / totalActualSupply;

                if (token == address(bbamDai)) {
                    // bpt token convert to underlying tokens by Rate
                    // e18 + e18 - e30 = e6
                    daiBalance += amountToken * bbamDai.getRate() / 1e18;
                } else if (token == address(bbamUsdc)) {
                    // bpt token convert to underlying tokens by Rate
                    // e18 + e18 - e30 = e6
                    usdcBalance += amountToken * bbamUsdc.getRate() / 1e30;
                } else if (token == address(bbamUsdt)) {
                    // bpt token convert to underlying tokens by Rate
                    // e18 + e18 - e18 = e18
                    usdtBalance = amountToken * bbamUsdt.getRate() / 1e30;
                }
            }
        }

        daiBalance += _oracleUsdcToDai(usdcBalance);
        daiBalance += _oracleUsdtToDai(usdtBalance);

        return daiBalance;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards

        if(auraLp.balanceOf(address(this)) == 0){
            return 0;
        }

        auraBaseRewardPool.getReward();

        // sell rewards
        uint256 totalDai;

        totalDai += AuraRewardUsdcUsdtDaiLibrary.swapBalToDai();
        AuraRewardUsdcUsdtDaiLibrary.transferAuraToTreasure();

        if (totalDai > 0) {
            dai.transfer(_to, totalDai);
        }

        return totalDai;
    }

    function _calcAmountsToSwap(uint256 amountDaiTotal) internal returns (uint256 amountUsdcInDai, uint256 amountUsdtInDai) {

        uint256 reserveDai;
        uint256 reserveUsdc;
        uint256 reserveUsdt;

        (IERC20[] memory tokens, uint256[] memory balances,) = vault.getPoolTokens(poolId);

        for (uint256 i = 0; i < tokens.length; i++) {

            address token = address(tokens[i]);

            if (token == address(bbamDai)) {
                reserveDai = balances[i] * bbamDai.getRate() / 1e18;
            } else if (token == address(bbamUsdc)) {
                reserveUsdc = balances[i] * bbamUsdc.getRate() / 1e30;
            } else if (token == address(bbamUsdt)) {
                reserveUsdt = balances[i] * bbamUsdt.getRate() / 1e30;
            }

        }

        uint256 amountDaiUsdc = _oracleDaiToUsdc(daiDm);
        uint256 amountDaiUsdt = _oracleDaiToUsdt(daiDm);

        amountUsdcInDai = (amountDaiTotal * reserveUsdc) / (reserveDai * amountDaiUsdc / daiDm
                + reserveUsdc + reserveUsdt * amountDaiUsdc / amountDaiUsdt);
        amountUsdtInDai = (amountDaiTotal * reserveUsdt) / (reserveDai * amountDaiUsdt / daiDm
                + reserveUsdc * amountDaiUsdt / amountDaiUsdc + reserveUsdt);
    }

    function _swapTokensToDai() internal {

        uint256 usdcBalance = usdc.balanceOf(address(this));
        WombatLibrary.swapExactTokensForTokens(
            wombatRouter,
            address(usdc),
            address(dai),
            wombatBasePool,
            usdcBalance,
            0,
            address(this)
        );

        uint256 usdtBalance = usdt.balanceOf(address(this));
        WombatLibrary.swapExactTokensForTokens(
            wombatRouter,
            address(usdt),
            address(dai),
            wombatBasePool,
            usdtBalance,
            0,
            address(this)
        );
    }

    function _swapDaiToTokens(uint256 amountUsdcInDai, uint256 amountUsdtInDai) internal {

        WombatLibrary.swapExactTokensForTokens(
            wombatRouter,
            address(dai),
            address(usdc),
            wombatBasePool,
            amountUsdcInDai,
            0,
            address(this)
        );

        WombatLibrary.swapExactTokensForTokens(
            wombatRouter,
            address(dai),
            address(usdt),
            wombatBasePool,
            amountUsdtInDai,
            0,
            address(this)
        );
    }

    function _swapAssetToBptToken(IERC20 asset, IBptToken bptToken, bytes32 poolId, uint256 decimals) internal {

        uint256 assetBalance = asset.balanceOf(address(this));
        uint256 minAmount = OvnMath.subBasisPoints(assetBalance * decimals / bptToken.getRate(), swapSlippageBP);
        BalancerLibrary.swap(
            vault,
            IVault.SwapKind.GIVEN_IN,
            address(asset),
            address(bptToken),
            poolId,
            assetBalance,
            minAmount,
            address(this),
            address(this)
        );
    }

    function _getBptAmounts(uint256 amount) internal view returns (uint256 daiBptAmount, uint256 usdcBptAmount, uint256 usdtBptAmount){

        (IERC20[] memory tokens, uint256[] memory balances,) = vault.getPoolTokens(poolId);

        uint256 reserveDai;
        uint256 reserveUsdc;
        uint256 reserveUsdt;

        for (uint256 i = 0; i < tokens.length; i++) {

            address token = address(tokens[i]);

            if (token == address(bbamDai)) {
                reserveDai = balances[i] * bbamDai.getRate() / 1e18;
            } else if (token == address(bbamUsdc)) {
                reserveUsdc = balances[i] * bbamUsdc.getRate() / 1e30;
            } else if (token == address(bbamUsdt)) {
                reserveUsdt = balances[i] * bbamUsdt.getRate() / 1e30;
            }

        }

        uint256 amountDaiUsdc = _oracleDaiToUsdc(daiDm);
        uint256 amountDaiUsdt = _oracleDaiToUsdt(daiDm);

        // with decimals
        uint256 usdcAmount = (amount * reserveUsdc) / (reserveDai
                + reserveUsdc * daiDm / amountDaiUsdc + reserveUsdt * daiDm / amountDaiUsdt);
        uint256 usdtAmount = (amount * reserveUsdt) / (reserveDai
                + reserveUsdc * daiDm / amountDaiUsdc + reserveUsdt * daiDm / amountDaiUsdt);
        uint256 daiAmount = usdcAmount * reserveDai / reserveUsdc;

        daiBptAmount = daiAmount * 1e18 / bbamDai.getRate();
        usdcBptAmount = usdcAmount * 1e30 / bbamUsdc.getRate();
        usdtBptAmount = usdtAmount * 1e30 / bbamUsdt.getRate();
    }

    function _oracleUsdcToDai(uint256 usdcAmount) internal view returns (uint256) {
        uint256 priceUsdc = ChainlinkLibrary.getPrice(oracleUsdc);
        uint256 priceDai = ChainlinkLibrary.getPrice(oracleDai);
        return ChainlinkLibrary.convertTokenToToken(usdcAmount, usdcDm, daiDm, priceUsdc, priceDai);
    }

    function _oracleUsdtToDai(uint256 usdtAmount) internal view returns (uint256) {
        uint256 priceUsdt = ChainlinkLibrary.getPrice(oracleUsdt);
        uint256 priceDai = ChainlinkLibrary.getPrice(oracleDai);
        return ChainlinkLibrary.convertTokenToToken(usdtAmount, usdtDm, daiDm, priceUsdt, priceDai);
    }

    function _oracleDaiToUsdc(uint256 daiAmount) internal view returns (uint256) {
        uint256 priceUsdc = ChainlinkLibrary.getPrice(oracleUsdc);
        uint256 priceDai = ChainlinkLibrary.getPrice(oracleDai);
        return ChainlinkLibrary.convertTokenToToken(daiAmount, daiDm, usdcDm, priceDai, priceUsdc);
    }

    function _oracleDaiToUsdt(uint256 daiAmount) internal view returns (uint256) {
        uint256 priceUsdt = ChainlinkLibrary.getPrice(oracleUsdt);
        uint256 priceDai = ChainlinkLibrary.getPrice(oracleDai);
        return ChainlinkLibrary.convertTokenToToken(daiAmount, daiDm, usdtDm, priceDai, priceUsdt);
    }

}
