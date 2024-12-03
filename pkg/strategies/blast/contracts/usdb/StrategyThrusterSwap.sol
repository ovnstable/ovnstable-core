// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Thruster.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";


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

    error SlippageError(
        uint160 curSqrtRatio,
        uint160 minSqrtRatio,
        uint160 maxSqrtRatio        
    );

    function swap(
        address pair,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96,
        bool zeroForOne,
        uint160 minSqrtRatio, 
        uint160 maxSqrtRatio
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

contract StrategyThrusterSwap is Strategy, IERC721Receiver {

    // assets for PL
    IERC20 public usdb;
    IERC20 public usdPlus;

    // reward assets
    IERC20 public hyper;
    IERC20 public thrust;

    // swap asset
    IERC20 public weth;

    int24[] public tickRange;
    uint256 public binSearchIterations;

    ICLPool poolUsdbWeth;
    ICLPool poolWethHyper;
    ICLPool poolWethThrust;

    uint256 rewardSwapSlippageBP;

    ICLPool public pool;
    INonfungiblePositionManager public npm; 
    ISwapSimulator public swapSimulator;

    // for stacking NFT instead of "gauge";
    INFPBooster public nfpBooster;

    uint256 public tokenLP;

    // --- events
    event StrategyUpdatedParams();

    event SwapErrorInternal(string message);

    event Staked(uint256 tokenId);

    // --- structs

    struct StrategyParams {
        address pool;
        int24[] tickRange;
        uint256 binSearchIterations;
        address swapSimulatorAddress;
        address npmAddress;

        address hyperTokenAddress;
        address thrustTokenAddress;
        address wethTokenAddress;

        address poolUsdbWeth;
        address poolWethHyper;
        address poolWethThrust;

        uint256 rewardSwapSlippageBP;
        address nfpBooster; // 0xAd21b2055974075Ab3E126AC5bF8d7Ee3Fcd848a
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
        usdb = IERC20(pool.token0()); 
        usdPlus = IERC20(pool.token1());

        tickRange = params.tickRange;
        
        binSearchIterations = params.binSearchIterations;
        swapSimulator = ISwapSimulator(params.swapSimulatorAddress);
        npm = INonfungiblePositionManager(params.npmAddress);

        nfpBooster = INFPBooster(params.nfpBooster);  

        hyper = IERC20(params.hyperTokenAddress);
        thrust = IERC20(params.thrustTokenAddress);
        weth = IERC20(params.wethTokenAddress);

        poolUsdbWeth = ICLPool(params.poolUsdbWeth);
        poolWethHyper = ICLPool(params.poolWethHyper);
        poolWethThrust = ICLPool(params.poolWethThrust);

        rewardSwapSlippageBP = params.rewardSwapSlippageBP;
     

        emit StrategyUpdatedParams(); // Это вообще зачем?
    }

    // --- logic

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
        _deposit(usdb.balanceOf(address(this)), usdPlus.balanceOf(address(this)), 0, 0, true); // USDB -> USD+
        // NOTE метод _deposit стейкает tokenLP в HyperLock
    }  


     //
    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        require(_asset == address(usdb) || _asset == address(usdPlus), "Some tokens are not compatible");
        require(_amount > 0, "Amount is less than or equal to 0"); // <--
        require(tokenLP != 0, "Not staked");

        return _withdraw(_asset, _amount, false);
    }


    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        require(_asset == address(usdb) || _asset == address(usdPlus), "Some tokens are not compatible");
        require(tokenLP != 0, "Not staked");

        return _withdraw(_asset, 0, true);
    }

    function _totalValue() internal view returns (uint256) {
        uint256 amount0 = 0;
        uint256 amount1 = 0;

        if (tokenLP != 0) {
            (uint160 sqrtRatioX96,,,,,,) = pool.slot0(); // добавил запятую 
            (,,,,,,, uint128 liquidity,,,,) = npm.positions(tokenLP);
            (amount0, amount1) = LiquidityAmounts.getAmountsForLiquidity(
                sqrtRatioX96,
                TickMath.getSqrtRatioAtTick(tickRange[0]),
                TickMath.getSqrtRatioAtTick(tickRange[1]),
                liquidity
            );
        }
        uint256 totalValue = amount0 + amount1 + usdb.balanceOf(address(this)) + usdPlus.balanceOf(address(this));
        return totalValue;
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {
        if (tokenLP == 0) {
            return 0;
        }

        // I. "Разстейкиваем" LP token
            // по-хорошему тут нужно сделать проверку типа "if (gauge.stakedContains(address(this), tokenLP))"
        nfpBooster.withdraw(tokenLP, address(this)); 



        // II. Собираем реварды 
        _collect_rewards_hyperlock(); // по идее этот метод должен перевести все HYPER и THRUST из ревардов hyperLock на баланс стратегии
        uint256 hyperBalance = hyper.balanceOf(address(this));
        uint256 thrustBalance = thrust.balanceOf(address(this));



        // III. Меняем оба HYPER и THRUST на WETH через V3 пулы Трастера 
        // address poolWethHyper = address(0xE16fbfcFB800E358De6c3210e86b5f23Fc0f2598);
        // address poolWethThrust = address(0x878C963776F374412C896e4B2a3DB84A36614c7C);

        (uint160 sqrtRatioWethHyperX96,,,,,,) = poolWethHyper.slot0();
        hyper.transfer(address(swapSimulator), hyperBalance);
        swapSimulator.swap(
            address(poolWethHyper), // так ведь можно ?) 
            hyperBalance, 
            0, 
            false,
            sqrtRatioWethHyperX96 * uint160((10000 - rewardSwapSlippageBP) / 10000),
            sqrtRatioWethHyperX96 * uint160((10000 + rewardSwapSlippageBP) / 10000)
        );
        swapSimulator.withdrawAll(address(poolWethHyper)); 


        (uint160 sqrtRatioWethThrustX96,,,,,,) = poolWethThrust.slot0();
        thrust.transfer(address(swapSimulator), thrustBalance);
        swapSimulator.swap(
            address(poolWethThrust), 
            thrustBalance, 
            0, 
            false,
            sqrtRatioWethThrustX96 * uint160((10000 - rewardSwapSlippageBP) / 10000),
            sqrtRatioWethThrustX96 * uint160((10000 + rewardSwapSlippageBP) / 10000)
        );
        swapSimulator.withdrawAll(address(poolWethThrust)); 



        // IV. Меняем весь WETH на USDB
        uint256 wethBalance = weth.balanceOf(address(this));

        (uint160 sqrtRatioUsdbWethX96,,,,,,) = poolWethThrust.slot0();
        thrust.transfer(address(swapSimulator), thrustBalance);
        swapSimulator.swap(
            address(poolUsdbWeth), 
            wethBalance, 
            0, 
            true,
            sqrtRatioUsdbWethX96 * uint160((10000 - rewardSwapSlippageBP) / 10000),
            sqrtRatioUsdbWethX96 * uint160((10000 + rewardSwapSlippageBP) / 10000)
        );
        swapSimulator.withdrawAll(address(poolUsdbWeth)); 



        // V. Заново вкладываем USD+ в пул 
        uint256 usdPlusBalance = usdPlus.balanceOf(address(this));
        _stake(address(usdPlus), usdPlusBalance);

        // VI. Стейкаем новый tokenLP в пул 
        npm.approve(address(nfpBooster), tokenLP);
        nfpBooster.deposit(tokenLP);

        return 0;
    }



    // updated 
    function _deposit(uint256 amount0, uint256 amount1, uint256 lockedAmount0, uint256 lockedAmount1, bool zeroForOne) internal {

        usdb.transfer(address(swapSimulator), amount0);
        usdPlus.transfer(address(swapSimulator), amount1);

        uint256 amountToSwap = _simulateSwap(amount0, amount1, zeroForOne);

        if (amountToSwap > 0) {
            swapSimulator.swap(address(pool), amountToSwap, 0, zeroForOne, 79224201403219477170569942574, 79236085330515764027303304732);
        }

        swapSimulator.withdrawAll(address(pool));

        amount0 = usdb.balanceOf(address(this)) - lockedAmount0;
        amount1 = usdPlus.balanceOf(address(this)) - lockedAmount1;

        usdb.approve(address(npm), amount0);
        usdPlus.approve(address(npm), amount1);

        if (tokenLP == 0) {
            INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
                token0: pool.token0(), // (OK)
                token1: pool.token1(), // (OK)
                tickSpacing: pool.tickSpacing(), // (OK)
                tickLower: tickRange[0],
                tickUpper: tickRange[1],
                amount0Desired: amount0,
                amount1Desired: amount1,
                amount0Min: 0,
                amount1Min: 0,
                recipient: address(this),
                deadline: block.timestamp,
                sqrtPriceX96: 0
            });
            (tokenLP,,,) = npm.mint(params);

            npm.approve(address(nfpBooster), tokenLP);
            nfpBooster.deposit(tokenLP);

            emit Staked(tokenLP);
        } else {
            // проверить, что там что-то есть, типа: if (gauge.stakedContains(address(this), stakedTokenId)) {
            nfpBooster.withdraw(tokenLP, address(this)); // норм ли что _to мы указываем address(this)
            _collect();

            INonfungiblePositionManager.IncreaseLiquidityParams memory params = INonfungiblePositionManager.IncreaseLiquidityParams({
                tokenId: tokenLP,
                amount0Desired: amount0,
                amount1Desired: amount1,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp
            });
            npm.increaseLiquidity(params);

            npm.approve(address(nfpBooster), tokenLP);
            nfpBooster.deposit(tokenLP);
        }
    }

    function _withdraw(address asset, uint256 amount, bool isFull) internal returns (uint256) {

        // Забираем tokenLP из HyperLock 
        nfpBooster.withdraw(tokenLP, address(this)); 
        _collect_rewards_hyperlock();

        (,,,,,,, uint128 liquidity,,,,) = npm.positions(tokenLP);
        if (liquidity == 0) {
            return 0;
        }

        INonfungiblePositionManager.DecreaseLiquidityParams memory params = INonfungiblePositionManager.DecreaseLiquidityParams({
            tokenId: tokenLP,
            liquidity: liquidity,
            amount0Min: 0,
            amount1Min: 0,
            deadline: block.timestamp
        });
        npm.decreaseLiquidity(params);

        // это относится только к выводу средств из самого Thruster
        _collect();

        if (!isFull) {
            uint256 amountToStake0 = usdb.balanceOf(address(this));
            uint256 amountToStake1 = usdPlus.balanceOf(address(this));
            uint256 lockedAmount0;
            uint256 lockedAmount1;
            if (amountToStake0 > amount) {
                amountToStake0 -= amount;
                lockedAmount0 = amount;
            } else {
                usdPlus.transfer(address(swapSimulator), amountToStake1);
                swapSimulator.swap(
                    address(pool), 
                    amount - amountToStake0, 
                    0, 
                    false,
                    79224201403219477170569942574, 
                    79236085330515764027303304732
                );
            }
            _deposit(amountToStake0, amountToStake1, lockedAmount0, lockedAmount1, false);  // USD+ -> USDB 
        } else {
            npm.burn(tokenLP);
            tokenLP = 0;

            if (asset == address(usdb)) {
                amount = usdPlus.balanceOf(address(this));
                if (amount > 0) {
                    usdPlus.transfer(address(swapSimulator), amount);
                    swapSimulator.swap(address(pool), amount, 0, false, 79224201403219477170569942574, 79236085330515764027303304732);
                }
            } 
            swapSimulator.withdrawAll(address(pool));
        }
        return IERC20(asset).balanceOf(address(this));
    }

    function _collect() internal {
        INonfungiblePositionManager.CollectParams memory collectParams = INonfungiblePositionManager.CollectParams({
            tokenId: tokenLP,
            recipient: address(this),
            amount0Max: type(uint128).max,
            amount1Max: type(uint128).max
        });
        npm.collect(collectParams);
    }


    function _collect_rewards_hyperlock() internal {
        CollectParams memory collectParams = CollectParams({
            tokenId: tokenLP,
            recipient: address(this),
            amount0Max: type(uint128).max,
            amount1Max: type(uint128).max
        });
        nfpBooster.collect(collectParams);
    } 

    function _simulateSwap(uint256 amount0, uint256 amount1, bool zeroForOne) internal returns (uint256 amountToSwap) {
        // usdc / usdc+

        BinSearchParams memory binSearchParams;
        binSearchParams.right = (amount0 > amount1 ? amount0 : amount1);

        

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

    function _getSqrtPriceLimitX96(ICLPool _pool, uint256 _slippageBP, bool _zeroForOne) internal view returns (uint160) {
        (uint160 sqrtRatioX96,,,,,,) = _pool.slot0(); // добавил запятую
        
        if (_zeroForOne) {
            return sqrtRatioX96 * (10000 - uint160(_slippageBP)) / 10000;
        } else {
            return sqrtRatioX96 * (10000 + uint160(_slippageBP)) / 10000;
        }
    }

    function _compareRatios(uint256 a, uint256 b, uint256 c, uint256 d) internal pure returns (bool) {
        return a * d > b * c;
    }
}