// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/connectors/contracts/stuff/Fenix.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract FenixSwap is Initializable, AccessControlUpgradeable, UUPSUpgradeable {

    function initialize() initializer public {        
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {}

    error SlippageError(
        uint160 curSqrtRatio,
        uint160 minSqrtRatio,
        uint160 maxSqrtRatio        
    );

    struct SwapCallbackData {
        address tokenA;
        address tokenB;
        int24 tickSpacing;
    }

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "!admin");
        _;
    }
    
    address factory;

    function setSimulationParams(address _factory) external {
        factory = _factory;
    }

    function swap(
        address pair,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96,
        bool zeroForOne
    ) public {
        ICLPool pool = ICLPool(pair);
        SwapCallbackData memory data = SwapCallbackData({
            tokenA: pool.token0(),
            tokenB: pool.token1(),
            tickSpacing: pool.tickSpacing()
        });

        if (zeroForOne) {
            IERC20(pool.token0()).transferFrom(msg.sender, address(this), amountIn);
        } else {
            IERC20(pool.token1()).transferFrom(msg.sender, address(this), amountIn);
        }

        uint160 maxSqrtRatio = uint160(79228162514264337593543950336); 
        uint160 minSqrtRatio = uint160(79224201403219477170569942574); 

        pool.swap(
            address(this), 
            zeroForOne, 
            int256(amountIn), 
            sqrtPriceLimitX96 == 0
                ? (zeroForOne ? TickMath.MIN_SQRT_RATIO + 1 : TickMath.MAX_SQRT_RATIO - 1)
                : sqrtPriceLimitX96, 
            abi.encode(data)
        );

        (uint160 sqrtRatioX96,,,,,) = pool.globalState();

        IERC20(pool.token0()).transfer(msg.sender, IERC20(pool.token0()).balanceOf(address(this)));
        IERC20(pool.token1()).transfer(msg.sender, IERC20(pool.token1()).balanceOf(address(this)));
    }   

    function uniswapV3SwapCallback (
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata _data
    ) external {}

    function algebraSwapCallback ( 
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata _data
    ) external {
        SwapCallbackData memory data = abi.decode(_data, (SwapCallbackData));

        (bool isExactInput, uint256 amountToPay) =
            amount0Delta > 0
                ? (data.tokenA < data.tokenB, uint256(amount0Delta))
                : (data.tokenB < data.tokenA, uint256(amount1Delta));

        if (isExactInput) {
            IERC20(data.tokenA).transfer(msg.sender, amountToPay);
        } else {
            IERC20(data.tokenB).transfer(msg.sender, amountToPay);
        }
    }
}