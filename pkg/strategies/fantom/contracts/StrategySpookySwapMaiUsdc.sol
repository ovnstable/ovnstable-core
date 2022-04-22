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
        console.log("_stake start");

        require(_asset == address(usdcToken), "Some token not compatible");

        (uint256 reserveUsdc, uint256 reserveMai,) = lpToken.getReserves();
        console.log("reserveUsdc: %s", reserveUsdc);
        console.log("reserveMai: %s", reserveMai);
        require(reserveUsdc > 1000 && reserveMai > 1000, 'StrategySpookySwapMaiUsdc: Liquidity lpToken reserves too low');
        console.log("_amount: %s", _amount);

        // count amount mai to swap
        uint256 amountUsdc = usdcToken.balanceOf(address(this));
        console.log("amountUsdc: %s", amountUsdc);
        uint256 amountUsdcToSwap = (reserveUsdc * 2 + amountUsdc - sqrt(reserveUsdc * reserveUsdc * 4 + amountUsdc * amountUsdc)) / 2;
        console.log("amountUsdcToSwap: %s", amountUsdcToSwap);

        // swap usdc to mai
        _swapExactTokensForTokens(
            address(usdcToken),
            address(maiToken),
            amountUsdcToSwap,
            0,
            address(this)
        );
        uint256 amountMai = maiToken.balanceOf(address(this));
        console.log("amountMai: %s", amountMai);

        // add liquidity
        maiToken.approve(address(router), amountMai);
        usdcToken.approve(address(router), amountUsdc);
        (uint256 amountA, uint256 amountB, uint256 liquidity) = router.addLiquidity(
            address(usdcToken),
            address(maiToken),
            amountUsdc,
            amountMai,
            1,
            1,
            address(this),
            block.timestamp + 600
        );
        console.log("amountA: %s", amountA);
        console.log("amountB: %s", amountB);
        uint256 amountUsdcAfter = usdcToken.balanceOf(address(this));
        console.log("amountUsdcAfter: %s", amountUsdcAfter);
        uint256 amountMaiAfter = maiToken.balanceOf(address(this));
        console.log("amountMaiAfter: %s", amountMaiAfter);
        uint256 lpBalance = lpToken.balanceOf(address(this));
        console.log("lpBalance: %s", lpBalance);

        // deposit lpTokens to masterChef
        lpToken.approve(address(masterChef), lpBalance);
        masterChef.deposit(pid, lpBalance);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        console.log("_unstake start");

        require(_asset == address(usdcToken), "Some token not compatible");

        // withdraw lpTokens from masterChef
        uint256 totalLpBalance = lpToken.totalSupply();
        (uint256 reserveUsdc, uint256 reserveMai,) = lpToken.getReserves();

        uint256 lpBalance = totalLpBalance * _amount / reserveUsdc / 2;
        console.log("_amount: %s", _amount);
        console.log("totalLpBalance: %s", totalLpBalance);
        console.log("reserveUsdc: %s", reserveUsdc);
        console.log("reserveMai: %s", reserveMai);
        console.log("lpBalance: %s", lpBalance);
        (uint256 lpBalanceUser, ) = masterChef.userInfo(pid, address(this));
        console.log("lpBalanceUser: %s", lpBalanceUser);
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
        console.log("amountA: %s", amountA);
        console.log("amountB: %s", amountB);

        // swap mai to usdc
        uint256 maiBalance = maiToken.balanceOf(address(this));
        console.log("maiBalance: %s", maiBalance);
        console.log("usdcBalance: %s", usdcToken.balanceOf(address(this)));
        uint256 maiUsdc = _swapExactTokensForTokens(
            address(maiToken),
            address(usdcToken),
            maiBalance,
            0,
            address(this)
        );
        console.log("maiUsdc: %s", maiUsdc);
        console.log("usdcBalance: %s", usdcToken.balanceOf(address(this)));

        return usdcToken.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        console.log("_unstakeFull start");

        require(_asset == address(usdcToken), "Some token not compatible");

        // withdraw lpTokens from masterChef
        (uint256 lpBalance, ) = masterChef.userInfo(pid, address(this));
        console.log("lpBalance: %s", lpBalance);
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
        console.log("amountA: %s", amountA);
        console.log("amountB: %s", amountB);

        // swap mai to usdc
        uint256 maiBalance = maiToken.balanceOf(address(this));
        console.log("maiBalance: %s", maiBalance);
        console.log("usdcTokenBalance: %s", usdcToken.balanceOf(address(this)));
        uint256 maiUsdc = _swapExactTokensForTokens(
            address(maiToken),
            address(usdcToken),
            maiBalance,
            0,
            address(this)
        );
        console.log("maiUsdc: %s", maiUsdc);
        console.log("usdcTokenBalance: %s", usdcToken.balanceOf(address(this)));

        return usdcToken.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        console.log("netAssetValue start");
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        console.log("liquidationValue start");
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        (uint256 lpBalance, ) = masterChef.userInfo(pid, address(this));
        console.log("lpBalance: %s", lpBalance);
        if (lpBalance == 0) {
            return 0;
        }
        uint256 totalLpBalance = lpToken.totalSupply();
        console.log("totalLpBalance: %s", totalLpBalance);
        (uint256 reserveUsdc, uint256 reserveMai,) = lpToken.getReserves();
        console.log("reserveUsdc: %s", reserveUsdc);
        console.log("reserveMai: %s", reserveMai);

        uint256 usdcBalance = reserveUsdc * lpBalance / totalLpBalance + usdcToken.balanceOf(address(this));
        console.log("usdcBalance: %s", usdcBalance);
        uint256 maiBalance = reserveMai * lpBalance / totalLpBalance + maiToken.balanceOf(address(this));
        console.log("maiBalance: %s", maiBalance);
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

    function sqrt(uint x) internal returns (uint y) {
        uint z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}
