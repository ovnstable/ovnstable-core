// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import {Strategy, Initializable, AccessControlUpgradeable, UUPSUpgradeable, IERC20, IERC20Metadata} from "@overnight-contracts/core/contracts/Strategy.sol";
import {ICLPool, TickMath, LiquidityAmounts, FullMath} from "@overnight-contracts/connectors/contracts/stuff/Fenix.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {ISwapSimulator} from "./interfaces/ISwapSimulator.sol";

contract SwapSimulatorFenix is ISwapSimulator, Initializable, AccessControlUpgradeable, UUPSUpgradeable {

    struct SwapCallbackData {
        address tokenA;
        address tokenB;
        int24 tickSpacing;
    }

    address public strategy;

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "!admin");
        _;
    }

    modifier onlyStrategy() {
        require(strategy == msg.sender, "!strategy");
        _;
    }

    function initialize() initializer public {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setStrategy(address _strategy) external onlyAdmin {
        strategy = _strategy;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {}

    function swap(address pair, uint256 amountIn, uint160 sqrtPriceLimitX96, bool zeroForOne) public onlyStrategy {
        ICLPool pool = ICLPool(pair);
        
        SwapCallbackData memory data = SwapCallbackData({
            tokenA: pool.token0(),
            tokenB: pool.token1(),
            tickSpacing: pool.tickSpacing()
        });

        uint160 poolBorder = zeroForOne ? TickMath.MIN_SQRT_RATIO + 1 : TickMath.MAX_SQRT_RATIO - 1;

        pool.swap(address(this), zeroForOne, int256(amountIn), poolBorder, abi.encode(data));

        (uint160 newSqrtRatioX96,,,,,) = pool.globalState();

        if (newSqrtRatioX96 < sqrtPriceLimitX96 && zeroForOne || newSqrtRatioX96 > sqrtPriceLimitX96 && !zeroForOne) {
            revert SlippageError(amountIn, newSqrtRatioX96, sqrtPriceLimitX96, zeroForOne);
        }
    }
    
    function simulateSwap(address pair, uint256 amountIn, bool zeroForOne, int24 lowerTick, int24 upperTick) external onlyStrategy {
        ICLPool pool = ICLPool(pair);
        uint160 borderForSwap = TickMath.getSqrtRatioAtTick(zeroForOne ? lowerTick : upperTick);

        swap(pair, amountIn, borderForSwap, zeroForOne);

        uint256[] memory ratio = new uint256[](2);
        (ratio[0], ratio[1]) = _getProportion(pool, lowerTick, upperTick);

        revert SwapError(
            IERC20(pool.token0()).balanceOf(address(this)),
            IERC20(pool.token1()).balanceOf(address(this)),
            ratio[0],
            ratio[1]
        );
    }

    function simulatePriceAfterSwap(address pair, uint256 amountIn, bool zeroForOne) external onlyStrategy {
        ICLPool pool = ICLPool(pair);
        uint160 borderForSwap = zeroForOne ? type(uint160).min: type(uint160).max;

        swap(pair, amountIn, borderForSwap, zeroForOne);

        (uint160 priceSqrtRatioX96,,,,,) = pool.globalState();
        revert PriceAfterSwapError(priceSqrtRatioX96);
    }

    function uniswapV3SwapCallback(int256 amount0Delta, int256 amount1Delta, bytes calldata _data) external {}

    function algebraSwapCallback(int256 amount0Delta, int256 amount1Delta, bytes calldata _data) external {
        SwapCallbackData memory data = abi.decode(_data, (SwapCallbackData));
        
        (bool isExactInput, uint256 amountToPay) =
            amount0Delta > 0
                ? (data.tokenA < data.tokenB, uint256(amount0Delta))
                : (data.tokenB < data.tokenA, uint256(amount1Delta));

        IERC20(isExactInput ? data.tokenA : data.tokenB).transfer(msg.sender, amountToPay);
    }

    function withdrawAll(address pair) external onlyStrategy {
        ICLPool pool = ICLPool(pair);
        IERC20 token0 = IERC20(pool.token0());
        IERC20 token1 = IERC20(pool.token1());
        if (token0.balanceOf(address(this)) > 0) {
            token0.transfer(msg.sender, token0.balanceOf(address(this)));
        }
        if (token1.balanceOf(address(this)) > 0) {
            token1.transfer(msg.sender, token1.balanceOf(address(this)));
        }
    }

    function _getProportion(ICLPool pool, int24 lowerTick, int24 upperTick) internal view returns (uint256 token0Amount, uint256 token1Amount) {
        IERC20Metadata token0 = IERC20Metadata(pool.token0());
        IERC20Metadata token1 = IERC20Metadata(pool.token1());
        uint256 dec0 = 10 ** token0.decimals();
        uint256 dec1 = 10 ** token1.decimals();
        (uint160 sqrtRatioX96,,,,,) = pool.globalState();

        uint160 sqrtRatio0 = TickMath.getSqrtRatioAtTick(lowerTick);
        uint160 sqrtRatio1 = TickMath.getSqrtRatioAtTick(upperTick);
        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(sqrtRatioX96, sqrtRatio0, sqrtRatio1, dec0 * 1000, dec1 * 1000);
        (token0Amount, token1Amount) = LiquidityAmounts.getAmountsForLiquidity(sqrtRatioX96, sqrtRatio0, sqrtRatio1, liquidity);
        uint256 denominator = dec0 > dec1 ? dec0 : dec1;

        token0Amount = token0Amount * (denominator / dec0);
        token1Amount = token1Amount * (denominator / dec1);
    }

    function totalValue(uint256, address, address, int24, int24, address, address) external onlyStrategy view returns (uint256) {
       revert("Not implemented");
    }

    function swapRewards(address tokenAddress, address wethAddress, address wethTokenPool, address usdbWethPool, uint256 rewardSwapSlippageBP) external onlyStrategy {
        IERC20 fnx = IERC20(tokenAddress);
        uint256 fnxBalance = fnx.balanceOf(address(this));
        if (fnxBalance > 0) {
            (uint160 sqrtRatioFnxWethX96,,,,,) = ICLPool(wethTokenPool).globalState();
            swap(wethTokenPool, fnxBalance, _calculateSlippageLimitBorder(sqrtRatioFnxWethX96, false, rewardSwapSlippageBP), false);

            IERC20 weth = IERC20(wethAddress);
            uint256 wethBalance = weth.balanceOf(address(this));
            (uint160 sqrtRatioUsdbWethX96,,,,,) = ICLPool(usdbWethPool).globalState();
            swap(usdbWethPool, wethBalance,  _calculateSlippageLimitBorder(sqrtRatioUsdbWethX96, false, rewardSwapSlippageBP), false);

            IERC20 usdb = IERC20(ICLPool(usdbWethPool).token0());
            if (fnx.balanceOf(address(this)) > 0) {
                fnx.transfer(msg.sender, fnx.balanceOf(address(this)));
            }
            if (weth.balanceOf(address(this)) > 0) {
                weth.transfer(msg.sender, weth.balanceOf(address(this)));
            }
            if (usdb.balanceOf(address(this)) > 0) {
                usdb.transfer(msg.sender, usdb.balanceOf(address(this)));
            }
        }        
    }

    function _calculateSlippageLimitBorder(uint160 sqrtRatioX96, bool zeroForOne, uint256 rewardSwapSlippageBP) internal pure returns (uint160) {
        if (zeroForOne) {
            return uint160(FullMath.mulDiv(uint256(sqrtRatioX96), _sqrt(10000 - rewardSwapSlippageBP), 100));
        } else {
            return uint160(FullMath.mulDiv(uint256(sqrtRatioX96), _sqrt(10000 + rewardSwapSlippageBP), 100));
        }        
    }

    function _sqrt(uint x) internal pure returns (uint y) {
        uint z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}