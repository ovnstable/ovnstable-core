// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./Strategy.sol";
import "../connectors/QuickswapExchange.sol";
import "../connectors/uniswap/interfaces/IUniswapV2Router01.sol";
import "../connectors/uniswap/interfaces/DragonLair.sol";
import "../connectors/uniswap/interfaces/IStakingRewards.sol";
import "../connectors/uniswap/UniswapV2LiquidityMathLibrary.sol";
import "../libraries/math/LowGasSafeMath.sol";

import "hardhat/console.sol";

contract StrategyQsMaiUsdt is Strategy, QuickswapExchange {

    using LowGasSafeMath for uint256;
    uint256 public constant minimumAmount = 1000;

    IERC20 public maiToken;
    IERC20 public usdtToken;
    IERC20 public usdcToken;
    IERC20 public quickToken;
    DragonLair public dQuickToken;

    uint256 public usdcTokenDenominator;
    uint256 public usdtTokenDenominator;
    uint256 public maiTokenDenominator;
    uint256 public quickTokenDenominator;


    IUniswapV2Router01 public router;
    IUniswapV2Pair public pair;
    IStakingRewards public stakingRewards;

    // --- events
    event StrategyTokens(address mai, address usdt, address usdc, address quick, address dQuick);
    event StrategyParams(address router, address pair, address stakingRewards);

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();

    }

    // --- setters

    function setTokens(
        address _maiToken,
        address _usdtToken,
        address _usdcToken,
        address _dQuickToken,
        address _quickToken
    ) external onlyAdmin {

        require(_usdcToken != address(0), "Zero address not allowed");
        require(_usdtToken != address(0), "Zero address not allowed");
        require(_maiToken != address(0), "Zero address not allowed");
        require(_dQuickToken != address(0), "Zero address not allowed");
        require(_quickToken != address(0), "Zero address not allowed");

        usdcToken = IERC20(_usdcToken);
        usdtToken = IERC20(_usdtToken);
        maiToken = IERC20(_maiToken);
        quickToken = IERC20(_quickToken);
        dQuickToken = DragonLair(_dQuickToken);

        usdcTokenDenominator = 10 ** IERC20Metadata(_usdcToken).decimals();
        usdtTokenDenominator = 10 ** IERC20Metadata(_usdtToken).decimals();
        maiTokenDenominator = 10 ** IERC20Metadata(_maiToken).decimals();
        quickTokenDenominator = 10 ** IERC20Metadata(_quickToken).decimals();

        emit StrategyTokens(_maiToken, _usdtToken, _usdcToken, _quickToken, _dQuickToken);
    }

    function setParams(
        address _router,
        address _pair,
        address _stakingRewards
    ) external onlyAdmin {
        require(_router != address(0), "Zero address not allowed");
        require(_pair != address(0), "Zero address not allowed");
        require(_stakingRewards != address(0), "Zero address not allowed");

        router = IUniswapV2Router01(_router);
        pair = IUniswapV2Pair(_pair);
        stakingRewards = IStakingRewards(_stakingRewards);

        setUniswapRouter(_router);

        emit StrategyParams(_router, _pair, _stakingRewards);
    }



    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
        require(_asset == address(usdcToken), "Some token not compatible");

        (uint256 reserveA, uint256 reserveB,) = pair.getReserves();
        require(reserveA > minimumAmount && reserveB > minimumAmount, 'Liquidity pair reserves too low');

        uint256 swapAmountUSDT = _swapToUSDT(_amount);

        uint256 amountMAI = _getSwapAmount(swapAmountUSDT, reserveB, reserveA);

        uint256 swapAmountMAI = _swapToMAI(amountMAI);

        _addLiquidity();
    }

    // 1) Return LP token from Staking Layer
    // 2) Remove liquidity (MAI/USDT) from Pool
    // 3) Calculation of the required share for conversion to USDC
    // 4) Convert share amount MAI/USDT to USDC
    // 5) Add liquidity MAI/USDT to Pool
    // 6) Staking LP token to Staking Layer

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        require(_asset == address(usdcToken), "Some token not compatible");

        stakingRewards.exit();

        uint256 _amountLp = pair.balanceOf(address(this));
        pair.approve(address(router), _amountLp);

        (uint amountA, uint amountB) = router.removeLiquidity(
            pair.token0(),
            pair.token1(),
            _amountLp,
            0,
            0,
            address(this),
            block.timestamp + 600);


        uint256 priceMai = getUsdcSellPrice(address(maiToken), address(usdcToken), maiTokenDenominator, amountA);
        // 6
        uint256 priceUsdt = getUsdcSellPrice(address(usdtToken), address(usdcToken), usdtTokenDenominator, amountB);
        // 6

        // 6 + 6 - 6
        uint256 totalUsdt = (usdtToken.balanceOf(address(this)) * priceUsdt) / usdtTokenDenominator;
        // 18 + 6 - 18
        uint256 totalMai = (maiToken.balanceOf(address(this)) * priceMai) / maiTokenDenominator;


        // 6
        uint256 halfAmount = (_amount / 2);
        halfAmount += halfAmount * 1 / 1000;
        // +0.1%

        uint256 maiNeed = totalMai - (halfAmount * priceMai) / usdcTokenDenominator;
        uint256 usdtNeed = totalUsdt - (halfAmount * priceUsdt) / usdcTokenDenominator;

        uint256 maiSell = (maiToken.balanceOf(address(this)) - (maiNeed * 10 ** 12));
        uint256 usdtSell = (usdtToken.balanceOf(address(this)) - usdtNeed);

        _swapToUSDC(maiSell, usdtSell);
        _addLiquidity();

        return usdcToken.balanceOf(address(this));
    }

    // 1) Claim rewards
    // 2) Unstake Lp tokens
    // 3) Remove all liquidity
    // 4) Swap MAI/USDT to USDC

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        require(_asset == address(usdcToken), "Some token not compatible");

        _claimRewards(address(this));
        stakingRewards.exit();

        uint256 _amount = pair.balanceOf(address(this));
        pair.approve(address(router), _amount);

        (uint amountA, uint amountB) = router.removeLiquidity(
            pair.token0(),
            pair.token1(),
            _amount,
            0,
            0,
            address(this),
            block.timestamp + 600);

        _swapToUSDC(maiToken.balanceOf(address(this)), usdtToken.balanceOf(address(this)));

        return usdcToken.balanceOf(address(this));
    }

    function _addLiquidity() internal {

        address[] memory path = new address[](2);
        path[0] = address(maiToken);
        path[1] = address(usdtToken);

        uint256 amountUSDT = usdtToken.balanceOf(address(this));
        uint256 amountMAI = maiToken.balanceOf(address(this));
        usdtToken.approve(address(router), amountUSDT);
        maiToken.approve(address(router), amountMAI);

        (,, uint256 amountLiquidity) = router.addLiquidity(path[0], path[1], amountMAI, amountUSDT, 1, 1, address(this), block.timestamp + 600);

        uint256 amountLP = pair.balanceOf(address(this));
        pair.approve(address(stakingRewards), amountLP);
        stakingRewards.stake(amountLP);
    }


    function _swapToMAI(uint256 amount) internal returns (uint256 swapAmount) {

        address[] memory path = new address[](2);
        path[0] = address(usdtToken);
        path[1] = address(maiToken);

        uint[] memory amountsOut = router.getAmountsOut(amount, path);

        usdtToken.approve(address(router), amount);

        uint256[] memory swapedAmounts = router.swapExactTokensForTokens(
            amount, //    uint amountIn,
            0, //          uint amountOutMin,
            path,
            address(this),
            block.timestamp + 600 // 10 mins
        );

        return swapedAmounts[1];
    }


    function _swapToUSDC(uint256 amountMAI, uint256 amountUSDT) internal {

        address[] memory path = new address[](2);

        if (amountUSDT != 0) {
            usdtToken.approve(address(router), amountUSDT);

            path[0] = address(usdtToken);
            path[1] = address(usdcToken);

            uint256[] memory swapedAmountsUSDT = router.swapExactTokensForTokens(
                amountUSDT, //    uint amountIn,
                0, //          uint amountOutMin,
                path,
                address(this),
                block.timestamp + 600 // 10 mins
            );
        }

        if (amountMAI != 0) {
            maiToken.approve(address(router), amountMAI);

            path[0] = address(maiToken);
            path[1] = address(usdcToken);

            uint256[] memory swapedAmountsMAI = router.swapExactTokensForTokens(
                amountMAI, //    uint amountIn,
                0, //          uint amountOutMin,
                path,
                address(this),
                block.timestamp + 600 // 10 mins
            );
        }
    }

    function _swapToUSDT(uint256 amount) internal returns (uint256 swapAmount) {

        address[] memory path = new address[](2);
        path[0] = address(usdcToken);
        path[1] = address(usdtToken);

        uint[] memory amountsOut = router.getAmountsOut(amount, path);

        usdcToken.approve(address(router), amount);

        uint256[] memory swapedAmounts = router.swapExactTokensForTokens(
            amount, //    uint amountIn,
            0, //          uint amountOutMin,
            path,
            address(this),
            block.timestamp + 600 // 10 mins
        );

        return swapedAmounts[1];
    }

    function _getSwapAmount(uint256 investmentA, uint256 reserveA, uint256 reserveB) internal view returns (uint256 swapAmount) {
        uint256 halfInvestment = investmentA / 2;
        uint256 nominator = router.getAmountOut(halfInvestment, reserveA, reserveB);
        uint256 denominator = router.quote(halfInvestment, reserveA.add(halfInvestment), reserveB.sub(nominator));
        swapAmount = investmentA.sub(Babylonian.sqrt(halfInvestment * halfInvestment * nominator / denominator));
        return swapAmount;
    }


    function netAssetValue() external view override returns (uint256){
        return _getTotal(false);
    }

    function liquidationValue() external view override returns (uint256){
        return _getTotal(true);
    }

    function _getTotal(bool sell) internal view returns (uint256) {

        uint256 balanceLp = stakingRewards.balanceOf(address(this));

        if (balanceLp == 0)
            return 0;

        (uint256 tokenAAmount, uint256 tokenBAmount) = UniswapV2LiquidityMathLibrary.getLiquidityValue(pair.factory(), pair.token0(), pair.token1(), balanceLp);

        uint256 total = 0;

        tokenAAmount += maiToken.balanceOf(address(this));
        if (tokenAAmount != 0) {
            uint256 price;

            if (sell)
                price = getUsdcSellPrice(address(maiToken), address(usdcToken), maiTokenDenominator, tokenAAmount);
            else
                price = getUsdcBuyPrice(address(maiToken), address(usdcToken), maiTokenDenominator, tokenAAmount);

            uint256 amount = ((tokenAAmount * price) / maiTokenDenominator);
            total += amount;
        }

        tokenBAmount += usdtToken.balanceOf(address(this));
        if (tokenBAmount != 0) {

            uint256 price;

            if (sell)
                price = getUsdcSellPrice(address(usdtToken), address(usdcToken), usdtTokenDenominator, tokenBAmount);
            else
                price = getUsdcBuyPrice(address(usdtToken), address(usdcToken), usdtTokenDenominator, tokenBAmount);

            uint256 amount = ((tokenBAmount * price) / usdtTokenDenominator);
            total += amount;
        }

        return total + usdcToken.balanceOf(address(this));
    }

    // Get rewards (dQuick) from Staking Layer
    // Convert dQuick to Quick
    // Swap Quick to USDC

    function _claimRewards(address _to) internal override returns (uint256){
        stakingRewards.getReward();

        uint256 dQuickBalance = dQuickToken.balanceOf(address(this));

        uint256 totalUsdc = 0;
        if (dQuickBalance != 0) {
            dQuickToken.leave(dQuickBalance);

            uint256 quickBalance = quickToken.balanceOf(address(this));

            if (quickBalance != 0) {

                uint256 amount = swapTokenToUsdc(
                    address(quickToken),
                    address(usdcToken),
                    quickTokenDenominator,
                    address(this),
                    address(_to),
                    quickBalance
                );

                totalUsdc += amount;
            }
        }

        return totalUsdc;


    }


}
