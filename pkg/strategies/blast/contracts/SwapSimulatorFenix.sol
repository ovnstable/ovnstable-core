// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Fenix.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "hardhat/console.sol";
import {ISwapSimulator} from "./interfaces/ISwapSimulator.sol";


contract SwapSimulatorFenix is ISwapSimulator, Initializable, AccessControlUpgradeable, UUPSUpgradeable {

    uint160 constant MIN_STABLE_SQRT_RATIO = 79224201403219477170569942574;
    uint160 constant MAX_STABLE_SQRT_RATIO = 79228162514264337593543950336;
    
    struct SwapCallbackData {
        address tokenA;
        address tokenB;
        int24 tickSpacing;
    }

    struct SimulationParams {
        address strategy;
        address factory;
    }

    address public strategy;
    address factory;

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

    function setSimulationParams(SimulationParams calldata params) external onlyAdmin {
        strategy = params.strategy;
        factory = params.factory;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {}

    function swap(
        address pair,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96,
        bool zeroForOne,
        uint160 minSqrtRatio,
        uint160 maxSqrtRatio
    ) public onlyStrategy {
        ICLPool pool = ICLPool(pair);

        SwapCallbackData memory data = SwapCallbackData({
            tokenA: pool.token0(),
            tokenB: pool.token1(),
            tickSpacing: pool.tickSpacing()
        });

        (uint160 oldSqrtRatioX96,,,,,) = pool.globalState();

        pool.swap( 
            address(this), 
            zeroForOne, 
            int256(amountIn), 
            sqrtPriceLimitX96 == 0
                ? (zeroForOne ? TickMath.MIN_SQRT_RATIO + 1 : TickMath.MAX_SQRT_RATIO - 1)
                : sqrtPriceLimitX96, 
            abi.encode(data)
        );

        (uint160 newSqrtRatioX96,,,,,) = pool.globalState();

        if (newSqrtRatioX96 > maxSqrtRatio || newSqrtRatioX96 < minSqrtRatio) {
            revert SlippageError(
                newSqrtRatioX96,
                minSqrtRatio,
                maxSqrtRatio,
                0
            );
        }
    }

    function simulateSwap(
        address pair,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96,
        bool zeroForOne,
        int24[] memory tickRange
    ) external onlyStrategy {
        ICLPool pool = ICLPool(pair);
        address token0 = pool.token0();
        address token1 = pool.token1();

        swap(pair, amountIn, sqrtPriceLimitX96, zeroForOne, MIN_STABLE_SQRT_RATIO, MAX_STABLE_SQRT_RATIO);

        uint256[] memory ratio = new uint256[](2);

        (ratio[0], ratio[1]) = _getProportion(pool, tickRange);

        revert SwapError(
            IERC20(token0).balanceOf(address(this)),
            IERC20(token1).balanceOf(address(this)),
            ratio[0],
            ratio[1]
        );
    }

    function simulatePriceAfterSwap(
        address pair,
        uint256 amountIn,
        bool zeroForOne
    ) external onlyStrategy {
        ICLPool pool = ICLPool(pair);

        swap(pair, amountIn, 0, zeroForOne, type(uint160).min, type(uint160).max);

        (uint160 priceSqrtRatioX96,,,,,) = pool.globalState();

        revert PriceAfterSwapError(priceSqrtRatioX96);
    }

    // если убрать, то данный контракт перестает реализовывать интерфейсы
    function uniswapV3SwapCallback (
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata _data
    ) external {}

    function algebraSwapCallback ( // заменил uniswapV3SwapCallback
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata _data
    ) external {
        console.log("strategy: ", strategy);
        console.log("factory:  ", factory);
        console.log("aSCb-1");
        SwapCallbackData memory data = abi.decode(_data, (SwapCallbackData));
        console.log("aSCb-2");

        (bool isExactInput, uint256 amountToPay) =
            amount0Delta > 0
                ? (data.tokenA < data.tokenB, uint256(amount0Delta))
                : (data.tokenB < data.tokenA, uint256(amount1Delta));

        if (isExactInput) {
            console.log("aSCb-3");
            IERC20(data.tokenA).transfer(msg.sender, amountToPay);
        } else {
            console.log("aSCb-4");
            IERC20(data.tokenB).transfer(msg.sender, amountToPay);
        }

        console.log("aSCb-5");

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

    function _getProportion(
        ICLPool pool,
        int24[] memory tickRange
    ) internal view returns (uint256 token0Amount, uint256 token1Amount) {
        IERC20Metadata token0 = IERC20Metadata(pool.token0());
        IERC20Metadata token1 = IERC20Metadata(pool.token1());
        uint256 dec0 = 10 ** token0.decimals();
        uint256 dec1 = 10 ** token1.decimals();
        (uint160 sqrtRatioX96,,,,,) = pool.globalState();

        uint160 sqrtRatio0 = TickMath.getSqrtRatioAtTick(tickRange[0]);
        uint160 sqrtRatio1 = TickMath.getSqrtRatioAtTick(tickRange[1]);
        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(sqrtRatioX96, sqrtRatio0, sqrtRatio1, dec0 * 1000, dec1 * 1000);
        (token0Amount, token1Amount) = LiquidityAmounts.getAmountsForLiquidity(sqrtRatioX96, sqrtRatio0, sqrtRatio1, liquidity);
        uint256 denominator = dec0 > dec1 ? dec0 : dec1;

        token0Amount = token0Amount * (denominator / dec0);
        token1Amount = token1Amount * (denominator / dec1);
    }
}