// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Balancer.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/Aura.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";

import "hardhat/console.sol";

contract StrategyAuraUsdcUsdtDai is Strategy {

    uint256 public constant MAX_UINT_VALUE = type(uint256).max;

    // --- params

    IERC20 public usdc;
    IERC20 public usdt;
    IERC20 public dai;

    IBptToken public bbamUsdc;
    IBptToken public bbamUsdt;
    IBptToken public bbamDai;
    IBptToken public bpt;

    IVault public vault;
    bytes32 public poolId;

    IPriceFeed public oracleUsdc;
    IPriceFeed public oracleUsdt;
    IPriceFeed public oracleDai;

    bytes32 public bbamUsdcPoolId;
    bytes32 public bbamUsdtPoolId;
    bytes32 public bbamDaiPoolId;

    uint256 public usdcDm;
    uint256 public usdtDm;
    uint256 public daiDm;

    IERC20 public auraLp;
    AuraBoosterLite public auraBoosterLite;
    AuraBaseRewardPool public auraBaseRewardPool;

    ISwapRouter public uniswapV3Router;

    // --- events

    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address usdc;
        address usdt;
        address dai;
        address bbamUsdc;
        address bbamUsdt;
        address bbamDai;
        address bpt;
        address vault;
        bytes32 bbamUsdcPoolId;
        bytes32 bbamUsdtPoolId;
        bytes32 bbamDaiPoolId;
        bytes32 poolId;
        address oracleUsdc;
        address oracleUsdt;
        address oracleDai;
        address auraLp;
        address auraBoosterLite;
        address auraBaseRewardPool;
        address uniswapV3Router;

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
        usdt = IERC20(params.usdt);
        dai = IERC20(params.dai);

        bbamUsdc = IBptToken(params.bbamUsdc);
        bbamUsdt = IBptToken(params.bbamUsdt);
        bbamDai = IBptToken(params.bbamDai);
        bpt = IBptToken(params.bpt);

        vault = IVault(params.vault);

        bbamUsdcPoolId = params.bbamUsdcPoolId;
        bbamUsdtPoolId = params.bbamUsdtPoolId;
        bbamDaiPoolId = params.bbamDaiPoolId;
        poolId = params.poolId;

        oracleUsdc = IPriceFeed(params.oracleUsdc);
        oracleUsdt = IPriceFeed(params.oracleUsdt);
        oracleDai = IPriceFeed(params.oracleDai);

        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();
        usdtDm = 10 ** IERC20Metadata(params.usdt).decimals();
        daiDm = 10 ** IERC20Metadata(params.dai).decimals();

        auraLp = IERC20(params.auraLp);
        auraBoosterLite = AuraBoosterLite(params.auraBoosterLite);
        auraBaseRewardPool = AuraBaseRewardPool(params.auraBaseRewardPool);

        uniswapV3Router = ISwapRouter(params.uniswapV3Router);

        bbamUsdc.approve(address(vault), MAX_UINT_VALUE);
        bbamUsdt.approve(address(vault), MAX_UINT_VALUE);
        bbamDai.approve(address(vault), MAX_UINT_VALUE);

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        (uint256 amountUsdtInUsdc, uint256 amountDaiInUsdc) = _calcAmountsToSwap(usdc.balanceOf(address(this)));

        _swapUsdcByUniV3(amountUsdtInUsdc, amountDaiInUsdc);

        _swapAssetToBptToken(usdc, bbamUsdc, bbamUsdcPoolId, 1e30);
        _swapAssetToBptToken(usdt, bbamUsdt, bbamUsdtPoolId, 1e30);
        _swapAssetToBptToken(dai, bbamDai, bbamDaiPoolId, 1e18);

        (IERC20[] memory tokens,,) = vault.getPoolTokens(poolId);

        IAsset[] memory assets = new IAsset[](4);
        uint256[] memory maxAmountsIn = new uint256[](4);

        // Must be without bpt fantom token
        uint256[] memory amountsIn = new uint256[](3);

        for (uint256 i; i < tokens.length; i++) {
            assets[i] = IAsset(address(tokens[i]));

            if(address(tokens[i]) == address(bbamUsdc)){
                amountsIn[i] = bbamUsdc.balanceOf(address(this));
                maxAmountsIn[i] = MAX_UINT_VALUE;
            }else if(address(tokens[i]) == address(bbamUsdt)){
                amountsIn[i] = bbamUsdt.balanceOf(address(this));
                maxAmountsIn[i] = MAX_UINT_VALUE;
            }else if(address(tokens[i]) == address(bbamDai)){
                amountsIn[i] = bbamDai.balanceOf(address(this));
                maxAmountsIn[i] = MAX_UINT_VALUE;
            }
        }

        uint256 EXACT_TOKENS_IN_FOR_BPT_OUT = 1;
        uint256 minimumBPT = 1;
        bytes memory userData = abi.encode(EXACT_TOKENS_IN_FOR_BPT_OUT, amountsIn, minimumBPT);

        IVault.JoinPoolRequest memory request = IVault.JoinPoolRequest(assets, maxAmountsIn, userData, false);

        // 2. Put bb-am-USDC to Stable pool
        vault.joinPool(poolId, address(this), address(this), request);

        // 3. Put bpt tokens to Aura
        uint256 bptAmount = bpt.balanceOf(address(this));
        bpt.approve(address(auraBoosterLite), bptAmount);
        auraBoosterLite.deposit(2, bptAmount, true);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        return 0;
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        return 0;
    }


    function _unstakeUsdc(uint256 bptAmount) internal returns (uint256){
        return 0;
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256){
        uint256 bptAmount = auraLp.balanceOf(address(this));
        if (bptAmount == 0) {
            return usdc.balanceOf(address(this));
        }
        return _convertBptToUsdc(bptAmount);
    }

    function _convertBptToUsdc(uint256 bptAmount) internal view returns (uint256) {

        // total used tokens
        uint256 totalActualSupply = bpt.getActualSupply();

        uint256 totalBalanceUsdc = usdc.balanceOf(address(this));

        (IERC20[] memory tokens, uint256[] memory balances,) = vault.getPoolTokens(poolId);

        // How it work?
        // 1. Calculating share (bb-am-USDC,bb-am-DAI,bb-am-USDT)
        // 2. Convert bb-* tokens to underlying tokens (DAI,USDC,USDT)
        // 3. Convert tokens (DAI,USDT) to USDC through Chainlink oracle

        // Iterate thought liquidity tokens (bb-am-DAI,bb-am-USDC,bb-am-USDT) not main bpt
        for (uint256 i = 0; i < tokens.length; i++) {

            address token = address(tokens[i]);

            // calculate share
            uint256 amountToken = balances[i] * bptAmount / totalActualSupply;

            if (token == address(bbamUsdc)) {
                // bpt token convert to underlying tokens by Rate
                // e18 + e18 - e30 = e6
                amountToken = amountToken * bbamUsdc.getRate() / 1e30;
                totalBalanceUsdc += amountToken;
            } else if (token == address(bbamUsdt)) {
                // bpt token convert to underlying tokens by Rate
                // e18 + e18 - e30 = e6
                amountToken = amountToken * bbamUsdt.getRate() / 1e30;
                amountToken += usdt.balanceOf(address(this));
                totalBalanceUsdc += _oracleUsdtToUsdc(amountToken);
            } else if (token == address(bbamDai)) {
                // bpt token convert to underlying tokens by Rate
                // e18 + e18 - e18 = e18
                amountToken = amountToken * bbamDai.getRate() / 1e18;
                amountToken += dai.balanceOf(address(this));
                totalBalanceUsdc += _oracleDaiToUsdc(amountToken);
            }

        }

        return totalBalanceUsdc;
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {

        // claim rewards
        return 0;
    }

    function _getAmountsToSwap(uint256 bptAmount) internal view
    returns (
        uint256 amountBptUsdc,
        uint256 amountBptUsdt,
        uint256 amountBptDai
    ) {

        uint256 totalActualSupply = bpt.getActualSupply();
        (IERC20[] memory tokens, uint256[] memory balances,) = vault.getPoolTokens(poolId);
        for (uint256 i = 0; i < tokens.length; i++) {

            address token = address(tokens[i]);

            // calculate share
            uint256 amountToken = balances[i] * bptAmount / totalActualSupply;

            if (token == address(bbamUsdc)) {
                amountBptUsdc = amountToken;
            } else if (token == address(bbamUsdt)) {
                amountBptUsdt = amountToken;
            }else if(token == address(bbamDai)){
                amountBptDai = amountToken;
            }

        }
    }

    function _calcAmountsToSwap(uint256 amountUsdcTotal) internal returns (uint256 amountUsdtInUsdc, uint256 amountDaiInUsdc) {

        uint256 reserveUsdc;
        uint256 reserveUsdt;
        uint256 reserveDai;

        (IERC20[] memory tokens, uint256[] memory balances,) = vault.getPoolTokens(poolId);

        for (uint256 i = 0; i < tokens.length; i++) {

            address token = address(tokens[i]);

            if (token == address(bbamUsdc)) {
                reserveUsdc = balances[i] * bbamUsdc.getRate() / 1e30;
            } else if (token == address(bbamUsdt)) {
                reserveUsdt = balances[i] * bbamUsdt.getRate() / 1e30;
            } else if (token == address(bbamDai)) {
                reserveDai = balances[i] * bbamDai.getRate() / 1e18;
            }

        }

        uint256 amountUsdcUsdt = _oracleUsdcToUsdt(usdcDm);
        uint256 amountUsdcDai = _oracleUsdcToDai(usdcDm);

        amountUsdtInUsdc = (amountUsdcTotal * reserveUsdt) / (reserveUsdc * amountUsdcUsdt / usdcDm
        + reserveUsdt + reserveDai * amountUsdcUsdt / amountUsdcDai);
        amountDaiInUsdc = (amountUsdcTotal * reserveDai) / (reserveUsdc * amountUsdcDai / usdcDm
        + reserveUsdt * amountUsdcDai / amountUsdcUsdt + reserveDai);

    }



    function _swapUsdcByUniV3(uint256 amountUsdtInUsdc, uint256 amountDaiInUsdc) internal {

        UniswapV3Library.singleSwap(
            uniswapV3Router,
            address(usdc),
            address(usdt),
            100, // 0.01%
            address(this),
            amountUsdtInUsdc,
            OvnMath.subBasisPoints(_oracleUsdcToUsdt(amountUsdtInUsdc), swapSlippageBP)
        );

        UniswapV3Library.singleSwap(
            uniswapV3Router,
            address(usdc),
            address(dai),
            100, // 0.01%
            address(this),
            amountDaiInUsdc,
            OvnMath.subBasisPoints(_oracleUsdcToDai(amountDaiInUsdc), swapSlippageBP)
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


    function _oracleUsdtToUsdc(uint256 usdtAmount) internal view returns (uint256) {
        uint256 priceUsdt = ChainlinkLibrary.getPrice(oracleUsdt);
        uint256 priceUsdc = ChainlinkLibrary.getPrice(oracleUsdc);
        return ChainlinkLibrary.convertTokenToToken(usdtAmount, usdtDm, usdcDm, priceUsdt, priceUsdc);
    }

    function _oracleDaiToUsdc(uint256 daiAmount) internal view returns (uint256) {
        uint256 priceDai = ChainlinkLibrary.getPrice(oracleDai);
        uint256 priceUsdc = ChainlinkLibrary.getPrice(oracleUsdc);
        return ChainlinkLibrary.convertTokenToToken(daiAmount, daiDm, usdcDm, priceDai, priceUsdc);
    }

    function _oracleUsdcToUsdt(uint256 usdcAmount) internal view returns (uint256) {
        uint256 priceUsdt = ChainlinkLibrary.getPrice(oracleUsdt);
        uint256 priceUsdc = ChainlinkLibrary.getPrice(oracleUsdc);
        return ChainlinkLibrary.convertTokenToToken(usdcAmount, usdcDm, usdtDm, priceUsdc, priceUsdt);
    }

    function _oracleUsdcToDai(uint256 usdcAmount) internal view returns (uint256) {
        uint256 priceDai = ChainlinkLibrary.getPrice(oracleDai);
        uint256 priceUsdc = ChainlinkLibrary.getPrice(oracleUsdc);
        return ChainlinkLibrary.convertTokenToToken(usdcAmount, usdcDm, daiDm, priceUsdc, priceDai);
    }

}
