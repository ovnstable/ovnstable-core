// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Aerodrome.sol";

interface ISwapSimulator {

    /// @notice Error containing information about a swap (for a simulation)
    /// @param balance0 The balance of token0 after the swap
    /// @param balance1 The balance of token1 after the swap
    /// @param ratio0 The ratio of token0 in the pool after the swap
    /// @param ratio1 The ratio of token1 in the pool after the swap
    error SwapError(
        uint256 balance0,
        uint256 balance1,
        uint256 ratio0,
        uint256 ratio1
    );

    function swap(
        address pair,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96,
        bool zeroForOne
    ) external;

    function simulateSwap(
        address pair,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96,
        bool zeroForOne,
        int24[] memory tickRange
    ) external;

    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata _data
    ) external;

    function withdrawAll(address pair) external;
}

contract StrategyAerodromeUsdc is Strategy {

    IERC20 public usdc;
    IERC20 public usdcPlus;

    int24[] public tickRange;
    uint256 public binSearchIterations;

    address public rewardsWallet;

    ICLPool public pool;
    INonfungiblePositionManager public npm;
    ISwapSimulator public swapSimulator;
    ICLGauge public gauge;

    uint256 public stakedTokenId;

    // --- events
    event StrategyUpdatedParams();

    event SwapErrorInternal(string message);

    event Staked(uint256 tokenId);

    // --- structs

    struct StrategyParams {
        address pool;
        address rewardsWallet;
        int24[] tickRange;
        uint256 binSearchIterations;
        address swapSimulatorAddress;
        address npmAddress;
    }

    struct BinSearchParams {
        uint256 left;
        uint256 right;
        uint256 mid;
    }

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        pool = ICLPool(params.pool);
        usdc = IERC20(pool.token0());
        usdcPlus = IERC20(pool.token1());
        rewardsWallet = params.rewardsWallet;
        tickRange = params.tickRange;
        binSearchIterations = params.binSearchIterations;
        swapSimulator = ISwapSimulator(params.swapSimulatorAddress);
        npm = INonfungiblePositionManager(params.npmAddress);
        gauge = ICLGauge(pool.gauge());
        emit StrategyUpdatedParams();
    }

    // --- logic

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
        _deposit();
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        require(_asset == address(usdc) || _asset == address(usdcPlus), "Some tokens are not compatible");
        require(_amount > 0, "Amount is 0");
        require(stakedTokenId != 0, "Not staked");

        return _withdraw(_asset, _amount, _beneficiary, false);
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        require(_asset == address(usdc) || _asset == address(usdcPlus), "Some tokens are not compatible");
        require(stakedTokenId != 0, "Not staked");

        return _withdraw(_asset, 0, _beneficiary, true);
    }

    function _totalValue() internal view returns (uint256) {
        (uint160 sqrtRatioX96,,,,,) = pool.slot0();
        (,,,,,,, uint128 liquidity,,,,) = npm.positions(stakedTokenId);
        (uint256 amount0, uint256 amount1) = LiquidityAmounts.getAmountsForLiquidity(
            sqrtRatioX96,
            TickMath.getSqrtRatioAtTick(tickRange[0]),
            TickMath.getSqrtRatioAtTick(tickRange[1]),
            liquidity
        );
        return amount0 + amount1 + usdc.balanceOf(address(this)) + usdcPlus.balanceOf(address(this));
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {
        return 0;
    }

    function _deposit() internal {
        usdc.transfer(address(swapSimulator), usdc.balanceOf(address(this)));
        usdcPlus.transfer(address(swapSimulator), usdcPlus.balanceOf(address(this)));

        (uint256 amountToSwap, bool zeroForOne) = _simulateSwap();
        swapSimulator.swap(address(pool), amountToSwap, 0, zeroForOne);
        swapSimulator.withdrawAll(address(pool));

        if (stakedTokenId == 0) {
            INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
                token0: pool.token0(),
                token1: pool.token1(),
                tickSpacing: pool.tickSpacing(),
                tickLower: tickRange[0],
                tickUpper: tickRange[1],
                amount0Desired: usdc.balanceOf(address(this)),
                amount1Desired: usdcPlus.balanceOf(address(this)),
                amount0Min: 0,
                amount1Min: 0,
                recipient: address(this),
                deadline: block.timestamp,
                sqrtPriceX96: 0
            });
            (stakedTokenId,,,) = npm.mint(params);
            gauge.deposit(stakedTokenId);

            emit Staked(stakedTokenId);
        } else {
            gauge.withdraw(stakedTokenId);

            INonfungiblePositionManager.IncreaseLiquidityParams memory params = INonfungiblePositionManager.IncreaseLiquidityParams({
                tokenId: stakedTokenId,
                amount0Desired: usdc.balanceOf(address(this)),
                amount1Desired: usdcPlus.balanceOf(address(this)),
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp
            });
            npm.increaseLiquidity(params);
            gauge.deposit(stakedTokenId);
        }
    }

    function _withdraw(address asset, uint256 amount, address beneficiary, bool isFull) internal returns (uint256) {
        gauge.withdraw(stakedTokenId);

        INonfungiblePositionManager.DecreaseLiquidityParams memory params = INonfungiblePositionManager.DecreaseLiquidityParams({
            tokenId: stakedTokenId,
            liquidity: _getLiquidity(tokenId),
            amount0Min: 0,
            amount1Min: 0,
            deadline: block.timestamp
        });
        
    }

    function _simulateSwap() internal returns (uint256 amountToSwap, bool zeroForOne) {
        zeroForOne = usdc.balanceOf(address(this)) > usdcPlus.balanceOf(address(this));

        BinSearchParams memory binSearchParams;
        binSearchParams.right = zeroForOne ? usdc.balanceOf(address(this)) : usdcPlus.balanceOf(address(this));
        for (uint256 i = 0; i < binSearchIterations; i++) {
            binSearchParams.mid = (binSearchParams.left + binSearchParams.right) / 2;
            if (binSearchParams.mid == 0) {
                break;
            }
            try swapSimulator.simulateSwap(
                address(pool),
                binSearchParams.mid,
                0,
                zeroForOne,
                tickRange
            ) {} 
            catch Error(string memory reason) {
                emit SwapErrorInternal(reason);
                break;
            }
            catch (bytes memory _data) {
                bytes memory data;
                assembly {
                    data := add(_data, 4)
                }
                uint256[] memory swapResult = new uint256[](4);
                (swapResult[0], swapResult[1], swapResult[2], swapResult[3]) = abi.decode(data, (uint256, uint256, uint256, uint256));
                bool compareResult = zeroForOne ? 
                    _compareRatios(swapResult[0], swapResult[1], swapResult[2], swapResult[3]) : 
                    _compareRatios(swapResult[1], swapResult[0], swapResult[3], swapResult[2]);
                if (compareResult) {
                    binSearchParams.left = binSearchParams.mid;
                } else {
                    binSearchParams.right = binSearchParams.mid;
                }
            }
        }
        amountToSwap = binSearchParams.mid;
    }

    function _compareRatios(uint256 a, uint256 b, uint256 c, uint256 d) internal pure returns (bool) {
        return a * d > b * c;
    }
}

contract SwapSimulatorAerodrome is ISwapSimulator, Initializable, AccessControlUpgradeable, UUPSUpgradeable {

    struct SwapCallbackData {
        address tokenA;
        address tokenB;
        int24 tickSpacing;
    }

    struct SimulationParams {
        address strategy;
        address factory;
    }

    address strategy;
    address factory;

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    modifier onlyStrategy() {
        require(strategy == msg.sender, "Restricted to strategy");
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
        bool zeroForOne
    ) public onlyStrategy {
        ICLPool pool = ICLPool(pair);
        SwapCallbackData memory data = SwapCallbackData({
            tokenA: pool.token0(),
            tokenB: pool.token1(),
            tickSpacing: pool.tickSpacing()
        });

        pool.swap(
            address(this), 
            zeroForOne, 
            int256(amountIn), 
            sqrtPriceLimitX96 == 0
                ? (zeroForOne ? TickMath.MIN_SQRT_RATIO + 1 : TickMath.MAX_SQRT_RATIO - 1)
                : sqrtPriceLimitX96, 
            abi.encode(data)
        );
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

        swap(pair, amountIn, sqrtPriceLimitX96, zeroForOne);

        uint256[] memory ratio = new uint256[](2);
        (ratio[0], ratio[1]) = _getProportion(pool, tickRange);
        revert SwapError(
            IERC20(token0).balanceOf(address(this)),
            IERC20(token1).balanceOf(address(this)),
            ratio[0],
            ratio[1]
        );
    }

    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata _data
    ) external {
        SwapCallbackData memory data = abi.decode(_data, (SwapCallbackData));
        CallbackValidation.verifyCallback(factory, data.tokenA, data.tokenB, data.tickSpacing);

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

    function withdrawAll(address pair) external onlyStrategy {
        ICLPool pool = ICLPool(pair);
        IERC20 token0 = IERC20(pool.token0());
        IERC20 token1 = IERC20(pool.token1());
        token0.transfer(msg.sender, token0.balanceOf(address(this)));
        token1.transfer(msg.sender, token1.balanceOf(address(this)));
    }

    function _getProportion(
        ICLPool pool, 
        IERC20 token0, 
        IERC20 token1, 
        int24[] memory tickRange
    ) internal view returns (uint256 token0Amount, uint256 token1Amount) {
        uint256 dec0 = 10 ** token0.decimals();
        uint256 dec1 = 10 ** token1.decimals();
        (uint160 sqrtRatioX96,,,,,) = pool.slot0();

        uint160 sqrtRatio0 = TickMath.getSqrtRatioAtTick(tickRange[0]);
        uint160 sqrtRatio1 = TickMath.getSqrtRatioAtTick(tickRange[1]);
        uint128 liquidity = pool.getLiquidityForAmounts(sqrtRatioX96, sqrtRatio0, sqrtRatio1, dec0 * 1000, dec1 * 1000);
        (token0Amount, token1Amount) = LiquidityAmounts.getAmountsForLiquidity(sqrtRatioX96, sqrtRatio0, sqrtRatio1, liquidity);
        uint256 denominator = dec0 > dec1 ? dec0 : dec1;

        token0Amount = token0Amount * (denominator / dec0);
        token1Amount = token1Amount * (denominator / dec1);
    }
}