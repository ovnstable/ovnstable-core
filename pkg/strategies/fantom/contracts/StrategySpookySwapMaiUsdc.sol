// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./core/Strategy.sol";
import "./exchanges/SpookySwapExchange.sol";
import "./libraries/LowGasSafeMath.sol";
import "./connectors/uniswap/v2/interfaces/IUniswapV2Router02.sol";
import "./connectors/uniswap/v2/interfaces/IUniswapV2Pair.sol";
import "./connectors/spookyswap/MasterChef.sol";

import "hardhat/console.sol";

contract StrategySpookySwapMaiUsdc is Strategy, SpookySwapExchange {
    using LowGasSafeMath for uint256;

    IERC20 public maiToken;
    IERC20 public usdcToken;
    IERC20 public booToken;

    IUniswapV2Router02 public router;
    IUniswapV2Pair public lpToken;
    MasterChef public masterChef;
    uint256 public pid;

    // --- events

    event StrategySpookySwapMaiUsdcUpdatedTokens(address maiToken, address usdcToken, address booToken);

    event StrategySpookySwapMaiUsdcUpdatedParams(address router, address lpToken, address masterChef, uint256 pid);


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- setters

    function setTokens(
        address _maiToken,
        address _usdcToken,
        address _booToken
    ) external onlyAdmin {

        require(_maiToken != address(0), "Zero address not allowed");
        require(_usdcToken != address(0), "Zero address not allowed");
        require(_booToken != address(0), "Zero address not allowed");

        maiToken = IERC20(_maiToken);
        usdcToken = IERC20(_usdcToken);
        booToken = IERC20(_booToken);

        emit StrategySpookySwapMaiUsdcUpdatedTokens(_maiToken, _usdcToken, _booToken);
    }

    function setParams(
        address _router,
        address _lpToken,
        address _masterChef,
        uint256 _pid
    ) external onlyAdmin {

        require(_router != address(0), "Zero address not allowed");
        require(_lpToken != address(0), "Zero address not allowed");
        require(_masterChef != address(0), "Zero address not allowed");

        router = IUniswapV2Router02(_router);
        lpToken = IUniswapV2Pair(_lpToken);
        masterChef = MasterChef(_masterChef);
        pid = _pid;

        _setUniswapRouter(_router);

        emit StrategySpookySwapMaiUsdcUpdatedParams(_router, _lpToken, _masterChef, _pid);
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(usdcToken), "Some token not compatible");

        (uint256 reserveUsdc, uint256 reserveMai,) = lpToken.getReserves();
        require(reserveUsdc > 1000 && reserveMai > 1000, 'StrategySpookySwapMaiUsdc: Liquidity lpToken reserves too low');

        // TODO надо правильно посчитать кол-во usdc, которое надо свапнуть на mai, чтобы потом при вызове addLiquidity() у нас все застейкалось
        // count amount mai to swap
        uint256 amountUsdc = usdcToken.balanceOf(address(this));
        uint256 halfAmountUsdc = amountUsdc / 2;
        uint256 halfAmountMai = router.getAmountOut(halfAmountUsdc, reserveUsdc, reserveMai);
        uint256 amountMaiToSwap = router.quote(halfAmountUsdc, reserveUsdc.add(halfAmountUsdc), reserveMai.sub(halfAmountMai));

        // swap usdc to mai
        _swapExactTokensForTokens(
            address(usdcToken),
            address(maiToken),
            amountUsdc,
            0,
            address(this)
        );
        uint256 amountMai = maiToken.balanceOf(address(this));

        // TODO amountMai и amountUsdc должны ли они быть в правильном соотношении через метод router.quote() можно проверить
        // add liquidity
        maiToken.approve(address(router), amountMai);
        usdcToken.approve(address(router), amountUsdc);
        (uint256 amountA, uint256 amountB, uint256 liquidity) = router.addLiquidity(
            address(maiToken),
            address(usdcToken),
            amountMai,
            amountUsdc,
            1,
            1,
            address(this),
            block.timestamp + 600
        );
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        // withdraw lpTokens from masterChef
        uint256 totalLpBalance = lpToken.totalSupply();
        (uint256 reserveUsdc, uint256 reserveMai,) = lpToken.getReserves();
        // TODO посчитать правильно lpBalance, чтобы анстейкнуть
        uint256 lpBalance = totalLpBalance * _amount / reserveUsdc;

        masterChef.withdraw(pid, lpBalance);

        // remove liquidity
        lpToken.approve(address(router), lpBalance);
        (uint amountA, uint amountB) = router.removeLiquidity(
            lpToken.token0(),
            lpToken.token1(),
            lpBalance,
            0,
            0,
            address(this),
            block.timestamp + 600
        );

        // swap mai to usdc
        uint256 maiBalance = maiToken.balanceOf(address(this));
        uint256 maiUsdc = _swapExactTokensForTokens(
            address(maiToken),
            address(usdcToken),
            maiBalance,
            0,
            address(this)
        );

        return usdcToken.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        // withdraw lpTokens from masterChef
        uint256 lpBalance = lpToken.balanceOf(address(this));
        masterChef.withdraw(pid, lpBalance);

        // remove liquidity
        lpToken.approve(address(router), lpBalance);
        (uint amountA, uint amountB) = router.removeLiquidity(
            lpToken.token0(),
            lpToken.token1(),
            lpBalance,
            0,
            0,
            address(this),
            block.timestamp + 600
        );

        // swap mai to usdc
        uint256 maiBalance = maiToken.balanceOf(address(this));
        uint256 maiUsdc = _swapExactTokensForTokens(
            address(maiToken),
            address(usdcToken),
            maiBalance,
            0,
            address(this)
        );

        return usdcToken.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    // TODO проверить правильно подсчета
    function _totalValue() internal view returns (uint256) {
        uint256 lpBalance = lpToken.balanceOf(address(this));
        uint256 totalLpBalance = lpToken.totalSupply();
        (uint256 reserveUsdc, uint256 reserveMai,) = lpToken.getReserves();

        uint256 usdcBalance = reserveUsdc * lpBalance / totalLpBalance + usdcToken.balanceOf(address(this));
        uint256 maiBalance = reserveMai * lpBalance / totalLpBalance + maiToken.balanceOf(address(this));
        uint256 usdcBalanceFromMai = _getAmountsOut(address(maiToken), address(usdcToken), maiBalance);

        return usdcBalance + usdcBalanceFromMai;
    }

    function _claimRewards(address _to) internal override returns (uint256) {
        // claim rewards
        masterChef.withdraw(pid, 0);

        // sell rewards
        uint256 totalUsdc;

        uint256 booBalance = booToken.balanceOf(address(this));
        if (booBalance != 0) {
            uint256 booUsdc = _swapExactTokensForTokens(
                address(booToken),
                address(usdcToken),
                booBalance,
                0,
                address(this)
            );
            totalUsdc += booUsdc;
        }

        usdcToken.transfer(_to, usdcToken.balanceOf(address(this)));
        return totalUsdc;
    }

}
