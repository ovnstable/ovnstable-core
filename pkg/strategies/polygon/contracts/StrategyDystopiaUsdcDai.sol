// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./core/Strategy.sol";
import "./exchanges/DystopiaExchange.sol";
import "./exchanges/BalancerExchange.sol";
import "./connectors/dystopia/interfaces/IDystopiaLP.sol";
import "./connectors/aave/interfaces/IPriceFeed.sol";

import {AaveBorrowLibrary} from "./libraries/AaveBorrowLibrary.sol";

contract StrategyDystopiaUsdcDai is Strategy, DystopiaExchange, BalancerExchange {

    IERC20 public usdcToken;
    IERC20 public daiToken;
    IERC20 public dystToken;
    IERC20 public wmaticToken;

    uint256 public usdcTokenDenominator;
    uint256 public daiTokenDenominator;

    IDystopiaLP public gauge;
    IDystopiaLP public dystPair;
    bytes32 public poolIdUsdcTusdDaiUsdt;

    IPriceFeed public oracleUsdc;
    IPriceFeed public oracleDai;


    // --- events

    event StrategyUpdatedTokens(address usdcToken, address daiToken, address dystToken, address wmaticToken, uint256 usdcTokenDenominator, uint256 daiTokenDenominator);

    event StrategyUpdatedParams(address gauge, address dystPair, address dystRouter, address balancerVault, bytes32 poolIdUsdcTusdDaiUsdt);


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setTokens(
        address _usdcToken,
        address _daiToken,
        address _dystToken,
        address _wmaticToken
    ) external onlyAdmin {

        require(_usdcToken != address(0), "Zero address not allowed");
        require(_daiToken != address(0), "Zero address not allowed");
        require(_dystToken != address(0), "Zero address not allowed");
        require(_wmaticToken != address(0), "Zero address not allowed");

        usdcToken = IERC20(_usdcToken);
        daiToken = IERC20(_daiToken);
        dystToken = IERC20(_dystToken);
        wmaticToken = IERC20(_wmaticToken);
        usdcTokenDenominator = 10 ** IERC20Metadata(_usdcToken).decimals();
        daiTokenDenominator = 10 ** IERC20Metadata(_daiToken).decimals();

        emit StrategyUpdatedTokens(_usdcToken, _daiToken, _dystToken, _wmaticToken, usdcTokenDenominator, daiTokenDenominator);
    }

    function setParams(
        address _gauge,
        address _dystPair,
        address _dystRouter,
        address _balancerVault,
        bytes32 _poolIdUsdcTusdDaiUsdt,
        address _oracleUsdc,
        address _oracleDai
    ) external onlyAdmin {

        require(_gauge != address(0), "Zero address not allowed");
        require(_dystPair != address(0), "Zero address not allowed");
        require(_dystRouter != address(0), "Zero address not allowed");
        require(_balancerVault != address(0), "Zero address not allowed");
        require(_poolIdUsdcTusdDaiUsdt != "", "Empty pool id not allowed");

        gauge = IDystopiaLP(_gauge);
        dystPair = IDystopiaLP(_dystPair);
        _setDystopiaRouter(_dystRouter);
        setBalancerVault(_balancerVault);
        poolIdUsdcTusdDaiUsdt = _poolIdUsdcTusdDaiUsdt;

        oracleUsdc = IPriceFeed(_oracleUsdc);
        oracleDai = IPriceFeed(_oracleDai);

        emit StrategyUpdatedParams(_gauge, _dystPair, _dystRouter, _balancerVault, _poolIdUsdcTusdDaiUsdt);
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(usdcToken), "Some token not compatible");

        (uint256 reserveUsdc, uint256 reserveDai,) = dystPair.getReserves();
        require(reserveUsdc > 10 ** 3 && reserveDai > 10 ** 15, 'Liquidity lpToken reserves too low');

        uint256 daiBalance;

        uint256 usdcBalance = usdcToken.balanceOf(address(this));
        //TODO add parameter to _getAmountToSwap() second token amount
        uint256 amountUsdcToSwap = _getAmountToSwap(
            usdcBalance,
            reserveUsdc,
            reserveDai,
            usdcTokenDenominator,
            daiTokenDenominator,
            1,
            poolIdUsdcTusdDaiUsdt,
            usdcToken,
            daiToken
        );

        // swap usdc to dai
        swap(
            poolIdUsdcTusdDaiUsdt,
            IVault.SwapKind.GIVEN_IN,
            IAsset(address(usdcToken)),
            IAsset(address(daiToken)),
            address(this),
            address(this),
            amountUsdcToSwap,
            0
        );

        // add liquidity
        usdcBalance = usdcToken.balanceOf(address(this));
        daiBalance = daiToken.balanceOf(address(this));

        _addLiquidity(
            address(usdcToken),
            address(daiToken),
            usdcBalance,
            daiBalance,
            OvnMath.subBasisPoints(usdcBalance, BASIS_POINTS_FOR_SLIPPAGE),
            OvnMath.subBasisPoints(daiBalance, BASIS_POINTS_FOR_SLIPPAGE),
            address(this)
        );

        uint256 balance = dystPair.balanceOf(address(this));

        dystPair.approve(address(gauge), balance);
        gauge.deposit(balance, 0);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        (uint256 reserveUsdc, uint256 reserveDai,) = dystPair.getReserves();
        require(reserveUsdc > 10 ** 3 && reserveDai > 10 ** 15, 'Liquidity lpToken reserves too low');


        uint256 lpTokenBalance = gauge.balanceOf(address(this));

        if (lpTokenBalance > 0) {
            // count amount to unstake
            uint256 totalLpBalance = dystPair.totalSupply();

            uint256 lpTokensToWithdraw = _getAmountLpTokensToWithdraw(
                OvnMath.addBasisPoints(_amount, BASIS_POINTS_FOR_SLIPPAGE),
                reserveUsdc,
                reserveDai,
                totalLpBalance,
                usdcTokenDenominator,
                daiTokenDenominator,
                poolIdUsdcTusdDaiUsdt,
                usdcToken,
                daiToken
            );

            if (lpTokensToWithdraw > lpTokenBalance) {
                lpTokensToWithdraw = lpTokenBalance;
            }

            gauge.withdraw(lpTokensToWithdraw);

            uint256 amountOutUsdcMin = reserveUsdc * lpTokensToWithdraw / totalLpBalance;
            uint256 amountOutDaiMin = reserveDai * lpTokensToWithdraw / totalLpBalance;

            // remove liquidity
            _removeLiquidity(
                address(usdcToken),
                address(daiToken),
                address(dystPair),
                lpTokensToWithdraw,
                OvnMath.subBasisPoints(amountOutUsdcMin, BASIS_POINTS_FOR_SLIPPAGE),
                OvnMath.subBasisPoints(amountOutDaiMin, BASIS_POINTS_FOR_SLIPPAGE),
                address(this)
            );
        }

        // swap dai to usdc
        uint256 daiBalance = daiToken.balanceOf(address(this));
        swap(
            poolIdUsdcTusdDaiUsdt,
            IVault.SwapKind.GIVEN_IN,
            IAsset(address(daiToken)),
            IAsset(address(usdcToken)),
            address(this),
            address(this),
            daiBalance,
            0
        );

        return usdcToken.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        gauge.withdrawAll();

        (uint256 reserveUsdc, uint256 reserveDai,) = dystPair.getReserves();
        require(reserveUsdc > 10 ** 3 && reserveDai > 10 ** 15, 'Liquidity lpToken reserves too low');

        uint256 lpTokenBalance = dystPair.balanceOf(address(this));
        if (lpTokenBalance > 0) {
            uint256 totalLpBalance = dystPair.totalSupply();
            uint256 amountOutUsdcMin = reserveUsdc * lpTokenBalance / totalLpBalance;
            uint256 amountOutDaiMin = reserveDai * lpTokenBalance / totalLpBalance;

            // remove liquidity
            _removeLiquidity(
                address(usdcToken),
                address(daiToken),
                address(dystPair),
                lpTokenBalance,
                OvnMath.subBasisPoints(amountOutUsdcMin, BASIS_POINTS_FOR_SLIPPAGE),
                OvnMath.subBasisPoints(amountOutDaiMin, BASIS_POINTS_FOR_SLIPPAGE),
                address(this)
            );
        }

        // swap dai to usdc
        uint256 daiBalance = daiToken.balanceOf(address(this));
        swap(
            poolIdUsdcTusdDaiUsdt,
            IVault.SwapKind.GIVEN_IN,
            IAsset(address(daiToken)),
            IAsset(address(usdcToken)),
            address(this),
            address(this),
            daiBalance,
            0
        );

        return usdcToken.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue(true);
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue(false);
    }

    function _totalValue(bool nav) internal view returns (uint256) {
        uint256 usdcBalance = usdcToken.balanceOf(address(this));
        uint256 daiBalance = daiToken.balanceOf(address(this));

        (uint256 reserveUsdc, uint256 reserveDai,) = dystPair.getReserves();
        uint256 lpTokenBalance = gauge.balanceOf(address(this));

        if (lpTokenBalance > 0) {
            uint256 totalLpBalance = dystPair.totalSupply();
            (uint256 reserveUsdc, uint256 reserveDai,) = dystPair.getReserves();
            usdcBalance += reserveUsdc * lpTokenBalance / totalLpBalance;
            daiBalance += reserveDai * lpTokenBalance / totalLpBalance;
        }

        uint256 usdcBalanceFromDai;
        if (daiBalance > 0) {

            if (nav) {
                uint256 priceUsdc = uint256(oracleUsdc.latestAnswer());
                uint256 priceDai = uint256(oracleDai.latestAnswer());
                usdcBalanceFromDai = AaveBorrowLibrary.convertTokenAmountToTokenAmount(daiBalance, daiTokenDenominator, usdcTokenDenominator, priceDai, priceUsdc);
            }else {
                usdcBalanceFromDai = onSwap(
                    poolIdUsdcTusdDaiUsdt,
                    IVault.SwapKind.GIVEN_IN,
                    daiToken,
                    usdcToken,
                    daiBalance
                );
            }
        }

        return usdcBalance + usdcBalanceFromDai;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        address[] memory token = new address[](1);
        token[0] = address(dystToken);
        gauge.getReward(address(this), token);

        // sell rewards
        uint256 dystBalance = dystToken.balanceOf(address(this));

        if (dystBalance > 0) {
            _swapExactTokensForTokens(
                address(dystToken),
                address(wmaticToken),
                address(usdcToken),
                dystBalance,
                address(this)
            );
        }

        uint256 totalUsdc = usdcToken.balanceOf(address(this));
        usdcToken.transfer(_to, totalUsdc);

        return totalUsdc;

    }
}
