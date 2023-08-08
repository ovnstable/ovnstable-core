// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Wombat.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";
import "@overnight-contracts/connectors/contracts/stuff/Camelot.sol";
import "@overnight-contracts/connectors/contracts/stuff/Wombex.sol";
import "@overnight-contracts/core/contracts/interfaces/IExchange.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";

import "hardhat/console.sol";

/**
 * @dev Self-investment strategy
 * 1) Buy DAI+ by next routing: (DAI->DAI+) in Uniswap v3 (0.01%)
 * 2) invest DAI+ to Overnight pool on Wombat
 * 3) Stake lp tokens in Wombex
 *
 * Sell rewards:
 * - WOM on UniswapV3
 * - WMX on Camelot
 *
 */

contract StrategyWombatOvnDaiPlus is Strategy {

    // --- structs

    struct StrategyParams {
        address dai;
        address daiPlus;
        address usdt;
        address usdc;
        address wom;
        address wmx;
        address assetWombat;
        address poolWombat;
        address basePoolWombat;
        address wombatRouter;
        address uniswapV3Router;
        uint24 poolFee0;
        uint24 poolFee1;
        address wombexBooster;
        uint256 wombexBoosterPid;
        address wombexVault;
        address camelotRouter;
    }

    // --- params

    IERC20 public dai;
    IERC20 public daiPlus;
    IERC20 public usdt;
    IERC20 public wom;

    IWombatAsset public assetWombat;
    uint256 public assetWombatDm;
    IWombatPool public basePoolWombat;
    IWombatPool public poolWombat; // ovn pool
    IWombatRouter public router;
    ISwapRouter public uniswapV3Router;

    uint24 public poolFee0;
    uint24 public poolFee1;

    IWombexBooster public wombexBooster;
    uint256 public wombexBoosterPid;
    IWombexVault public wombexVault;
    IERC20 public wmx;
    IERC20 public usdc;

    ICamelotRouter public camelotRouter;


    // --- events

    event StrategyUpdatedParams();

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }

    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        dai = IERC20(params.dai);
        daiPlus = IERC20(params.daiPlus);
        usdt = IERC20(params.usdt);
        usdc = IERC20(params.usdc);
        wom = IERC20(params.wom);
        wmx = IERC20(params.wmx);

        assetWombat = IWombatAsset(params.assetWombat);
        poolWombat = IWombatPool(params.poolWombat);
        basePoolWombat = IWombatPool(params.basePoolWombat);
        router = IWombatRouter(params.wombatRouter);

        uniswapV3Router = ISwapRouter(params.uniswapV3Router);
        poolFee0 = params.poolFee0;
        poolFee1 = params.poolFee1;

        assetWombatDm = 10 ** IERC20Metadata(params.assetWombat).decimals();

        wombexBooster = IWombexBooster(params.wombexBooster);
        wombexBoosterPid = params.wombexBoosterPid;
        wombexVault = IWombexVault(params.wombexVault);

        camelotRouter = ICamelotRouter(params.camelotRouter);

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _swapAllToken0ToToken1(IERC20 token0, IERC20 token1, uint256 amountOutMin) internal {

        uint256 amountToSwap = token0.balanceOf(address(this));

        UniswapV3Library.singleSwap(
            uniswapV3Router,
            address(token0),
            address(token1),
            100, // 0.01%
            address(this),
            amountToSwap,
            amountOutMin
        );

    }

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        return _amount;
    }

    function unstakeAmount(uint256 _amount) external onlyPortfolioAgent {

        uint256 minNavExpected = OvnMath.subBasisPoints(this.netAssetValue(), navSlippageBP);

        // get amount to unstake
        (uint256 oneAsset,) = poolWombat.quotePotentialWithdraw(address(daiPlus), assetWombatDm);

        uint256 assetBalance = wombexVault.balanceOf(address(this));
        uint256 assetAmount;
        if (_amount == 0) {
            assetAmount = assetBalance;
        } else {
            assetAmount = OvnMath.addBasisPoints(_amount, swapSlippageBP) * assetWombatDm / oneAsset;

            if (assetAmount > assetBalance) {
                assetAmount = assetBalance;
            }
        }

        wombexVault.withdrawAndUnwrap(assetAmount, false);
        assetWombat.approve(address(poolWombat), assetAmount);

        IERC20 usdp = IERC20(0xe80772Eaf6e2E18B651F160Bc9158b2A5caFCA65);
        IERC20 usdc = IERC20(0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8);

        (uint256 usdpAmount, uint256 usdpFee) = poolWombat.quotePotentialWithdraw(address(usdp), assetAmount);
        (uint256 usdcAmount, uint256 usdcFee) = poolWombat.quotePotentialWithdraw(address(usdc), assetAmount);
        (uint256 daiAmount, uint256 daiFee) = poolWombat.quotePotentialWithdraw(address(daiPlus), assetAmount);


//        console.log('USD+     %s', usdpAmount);
//        console.log('USD+ fee %s', usdpFee);
//
//        console.log('USDC     %s', usdcAmount);
//        console.log('USDC fee %s', usdcFee);
//
//        console.log('DAI+     %s', daiAmount);
//        console.log('DAI+ fee %s', daiFee);
        //
//        if (usdpFee < usdcFee) {
//
//            if (usdpFee < daiFee) {
//                _unstakeUsdp(assetAmount, _amount);
//            } else {
//                _unstakeDaip(assetAmount, _amount);
//            }
//        } else if (usdcFee < usdpFee) {
//
//            if (usdcFee < daiFee) {
//                _unstakeUsdc(assetAmount, _amount);
//            } else {
//                _unstakeDaip(assetAmount, _amount);
//            }
//        } else if (daiFee < usdcFee) {
//
//            if (daiFee < usdpFee) {
//                _unstakeDaip(assetAmount, _amount);
//            } else {
//                _unstakeUsdp(assetAmount, _amount);
//            }
//        } else if (daiFee < usdpFee) {
//
//            if (daiFee < usdcFee) {
//                _unstakeDaip(assetAmount, _amount);
//            } else {
//                _unstakeUsdc(assetAmount, _amount);
//            }
//        }


        require(this.netAssetValue() >= minNavExpected, "Strategy NAV less than expected");
    }

    function _unstakeUsdp(uint256 assetAmount, uint256 _amount) internal {

        IERC20 usdp = IERC20(0xe80772Eaf6e2E18B651F160Bc9158b2A5caFCA65);
        IERC20 usdc = IERC20(0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8);

        poolWombat.withdrawFromOtherAsset(
            address(daiPlus),
            address(usdp),
            assetAmount,
            _amount,
            address(this),
            block.timestamp
        );

        IExchange exchange = IExchange(0x73cb180bf0521828d8849bc8CF2B920918e23032);
        exchange.redeem(address(usdc), usdp.balanceOf(address(this)));

        uint256 amountOutMin = OvnMath.subBasisPoints(_oracleUsdcToDai(usdc.balanceOf(address(this))), swapSlippageBP);
        _swapAllToken0ToToken1(usdc, dai, amountOutMin);
    }

    function _unstakeUsdc(uint256 assetAmount, uint256 _amount) internal {


        IERC20 usdp = IERC20(0xe80772Eaf6e2E18B651F160Bc9158b2A5caFCA65);
        IERC20 usdc = IERC20(0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8);

        poolWombat.withdrawFromOtherAsset(
            address(daiPlus),
            address(usdc),
            assetAmount,
            OvnMath.subBasisPoints(_oracleDaiToUsdc(_amount), swapSlippageBP),
            address(this),
            block.timestamp
        );


        uint256 amountOutMin = OvnMath.subBasisPoints(_oracleUsdcToDai(usdc.balanceOf(address(this))), swapSlippageBP);
        _swapAllToken0ToToken1(usdc, dai, amountOutMin);
    }

    function unstakeDaip() external onlyPortfolioAgent {

        IExchange exchange = IExchange(0xc8261DC93428F0D2dC04D675b7852CdCdC19d4fd);
        exchange.redeem(address(dai), daiPlus.balanceOf(address(this)));

    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        return dai.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue(true);
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue(false);
    }

    function _totalValue(bool nav) internal view returns (uint256) {
        uint256 daiBalance = dai.balanceOf(address(this));
        daiBalance += daiPlus.balanceOf(address(this));
        IERC20 usdPlus = IERC20(0xe80772Eaf6e2E18B651F160Bc9158b2A5caFCA65);

        uint256 assetBalance = wombexVault.balanceOf(address(this));
        if (assetBalance > 0) {

            if (nav) {
                (uint256 daiPlusAmount,) = poolWombat.quotePotentialWithdraw(address(daiPlus), assetBalance);
                daiBalance += daiPlusAmount;
            } else {
                (uint256 daiPlusAmount,) = poolWombat.quotePotentialWithdraw(address(daiPlus), assetBalance);
                daiBalance += daiPlusAmount;
            }
        }

        return daiBalance;
    }

    function _claimRewards(address _to) internal override returns (uint256) {
        return 0;
    }

    function _oracleDaiToUsdc(uint256 amount) internal view returns (uint256) {
        IPriceFeed oracleUsdc = IPriceFeed(0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3);
        IPriceFeed oracleDai = IPriceFeed(0xc5C8E77B397E531B8EC06BFb0048328B30E9eCfB);

        uint256 usdcDm = 10 ** 6;
        uint256 daiDm = 10 ** 18;

        uint256 priceUsdc = uint256(oracleUsdc.latestAnswer());
        uint256 priceDai = uint256(oracleDai.latestAnswer());
        return ChainlinkLibrary.convertTokenToToken(amount, daiDm, usdcDm, priceDai, priceUsdc);
    }

    function _oracleUsdcToDai(uint256 amount) internal view returns (uint256) {
        IPriceFeed oracleUsdc = IPriceFeed(0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3);
        IPriceFeed oracleDai = IPriceFeed(0xc5C8E77B397E531B8EC06BFb0048328B30E9eCfB);

        uint256 usdcDm = 10 ** 6;
        uint256 daiDm = 10 ** 18;

        uint256 priceUsdc = uint256(oracleUsdc.latestAnswer());
        uint256 priceDai = uint256(oracleDai.latestAnswer());
        return ChainlinkLibrary.convertTokenToToken(amount, usdcDm, daiDm, priceUsdc, priceDai);
    }

}
