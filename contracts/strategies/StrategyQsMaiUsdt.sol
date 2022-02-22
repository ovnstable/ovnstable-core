// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./Strategy.sol";
import "../connectors/QuickswapExchange.sol";
import "../connectors/uniswap/interfaces/IUniswapV2Router01.sol";
import "../connectors/uniswap/UniswapV2LiquidityMathLibrary.sol";
import "../libraries/math/LowGasSafeMath.sol";

import "hardhat/console.sol";

contract StrategyQsMaiUsdt is Strategy, QuickswapExchange {

    using LowGasSafeMath for uint256;
    uint256 public constant minimumAmount = 1000;

    IERC20 public maiToken;
    IERC20 public usdtToken;
    IERC20 public usdcToken;

    uint256 public usdcTokenDenominator;
    uint256 public usdtTokenDenominator;
    uint256 public maiTokenDenominator;


    IUniswapV2Router01 public router;
    IUniswapV2Pair public pair;

    // --- events



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
        address _usdcToken
    ) external onlyAdmin {

        require(_usdcToken != address(0), "Zero address not allowed");
        require(_usdtToken != address(0), "Zero address not allowed");
        require(_maiToken != address(0), "Zero address not allowed");

        usdcToken = IERC20(_usdcToken);
        usdtToken = IERC20(_usdtToken);
        maiToken = IERC20(_maiToken);

        usdcTokenDenominator = 10 ** IERC20Metadata(_usdcToken).decimals();
        usdtTokenDenominator = 10 ** IERC20Metadata(_usdtToken).decimals();
        maiTokenDenominator = 10 ** IERC20Metadata(_maiToken).decimals();

    }

    function setParams(
        address _router,
        address _pair
    ) external onlyAdmin {
        require(_router != address(0), "Zero address not allowed");
        require(_pair != address(0), "Zero address not allowed");

        router = IUniswapV2Router01(_router);
        pair = IUniswapV2Pair(_pair);
    }



    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
        require(_asset == address(usdcToken), "Some token not compatible");

        (uint256 reserveA, uint256 reserveB,) = pair.getReserves();
        require(reserveA > minimumAmount && reserveB > minimumAmount, 'ConnectorQuickswapUsdtMai: Liquidity pair reserves too low');

        console.log('Reserve A %s Reserve B %s', reserveA, reserveB);

        console.log('1:Balance USDC %s', usdcToken.balanceOf(address(this)) / usdcTokenDenominator);
        console.log('1:Balance USDT %s', usdtToken.balanceOf(address(this)) / usdtTokenDenominator);
        console.log('1:Balance MAI %s', maiToken.balanceOf(address(this)) /  maiTokenDenominator);

        uint256 swapAmountUSDT = _swapToUSDT(_amount);

        console.log('2:Balance USDC %s', usdcToken.balanceOf(address(this)) / usdcTokenDenominator);
        console.log('2:Balance USDT %s', usdtToken.balanceOf(address(this)) / usdtTokenDenominator);
        console.log('2:Balance MAI %s', maiToken.balanceOf(address(this)) /  maiTokenDenominator);

        uint256 amountMAI = _getSwapAmount(swapAmountUSDT, reserveB, reserveA);

        console.log('Need MAI %s', amountMAI);

        uint256 swapAmountMAI = _swapToMAI(amountMAI);

        console.log('3:Balance USDC %s', usdcToken.balanceOf(address(this)) / usdcTokenDenominator);
        console.log('3:Balance USDT %s', usdtToken.balanceOf(address(this)) /  usdtTokenDenominator);
        console.log('3:Balance MAI %s', maiToken.balanceOf(address(this)) / maiTokenDenominator);


        _addLiquidity();

        console.log('4:Balance USDC %s', usdcToken.balanceOf(address(this)) / usdcTokenDenominator);
        console.log('4:Balance USDT %s', usdtToken.balanceOf(address(this)) /  usdtTokenDenominator);
        console.log('4:Balance MAI %s', maiToken.balanceOf(address(this)) / maiTokenDenominator);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        pair.approve(address(router), _amount);

        (uint amountA, uint amountB) = router.removeLiquidity(pair.token0(), pair.token1(), _amount, 0, 0, address(this), block.timestamp + 600);


        _swapToUSDC();


        return _amount;
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        uint256 _amount = maiToken.balanceOf(address(this));

        //TODO
        return 0;
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


    function _swapToUSDC() internal returns (uint256 swapAmount) {

        address[] memory path = new address[](2);
        path[0] = address(usdtToken);
        path[1] = address(usdcToken);

        uint256 amountUSDT = usdtToken.balanceOf(address(this));
        usdtToken.approve(address(router), amountUSDT);

        uint256[] memory swapedAmountsUSDT = router.swapExactTokensForTokens(
            amountUSDT, //    uint amountIn,
            0, //          uint amountOutMin,
            path,
            address(this),
            block.timestamp + 600 // 10 mins
        );

        path[0] = address(maiToken);
        path[1] = address(usdcToken);

        uint256 amountMAI = maiToken.balanceOf(address(this));
        maiToken.approve(address(router), amountMAI);

        uint256[] memory swapedAmountsMAI = router.swapExactTokensForTokens(
            amountMAI, //    uint amountIn,
            0, //          uint amountOutMin,
            path,
            address(this),
            block.timestamp + 600 // 10 mins
        );

        return swapedAmountsUSDT[1] + swapedAmountsMAI[1];
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

        uint256 amountLp = pair.balanceOf(address(this));
        console.log('Amount LP %s', amountLp);

        return 0;
    }

    function liquidationValue() external view override returns (uint256){
        return 0;
    }

    function _claimRewards(address _to) internal override returns (uint256){
        return 0;
    }


}
