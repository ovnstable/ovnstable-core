// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";

// import "@overnight-contracts/connectors/contracts/stuff/Fenix.sol";
import "./Fenix.sol";
import "hardhat/console.sol";

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

contract StrategyFenixSwap is Strategy, IERC721Receiver {

    // assets for PL
    IERC20 public usdb;
    IERC20 public usdPlus;

    // reward asset
    IERC20 public fnx;

    int24[] public tickRange;
    uint256 public binSearchIterations;

    ICLPool private poolUsdbUsdPlus;
    ICLPool private poolFnxUsdb;

    uint256 rewardSwapSlippageBP;

    uint160 sqrtRatioStablecoinsX96Min;
    uint160 sqrtRatioStablecoinsX96Max;

    ICLPool public pool;
    INonfungiblePositionManager public npm;
    ISwapSimulator public swapSimulator;

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

        address fnxTokenAddress;

        address poolFnxUsdb;
        address poolUsdbUsdPlus;

        uint256 rewardSwapSlippageBP;

        uint160 sqrtRatioStablecoinsX96Min;
        uint160 sqrtRatioStablecoinsX96Max;
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

    function setParams(StrategyParams calldata params) external { // Добавить Onlyadmin

        pool = ICLPool(params.pool);

        usdb = IERC20(pool.token0());
        usdPlus = IERC20(pool.token1());
        fnx = IERC20(params.fnxTokenAddress);

        swapSimulator = ISwapSimulator(params.swapSimulatorAddress);
        npm = INonfungiblePositionManager(params.npmAddress);

        rewardSwapSlippageBP = params.rewardSwapSlippageBP;
        sqrtRatioStablecoinsX96Min = params.sqrtRatioStablecoinsX96Min;
        sqrtRatioStablecoinsX96Max = params.sqrtRatioStablecoinsX96Max;

        binSearchIterations = params.binSearchIterations;
        tickRange = params.tickRange;

        poolFnxUsdb = ICLPool(params.poolFnxUsdb);
        poolUsdbUsdPlus = ICLPool(params.poolUsdbUsdPlus);
        
        emit StrategyUpdatedParams();
    }

    // --- logic

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) { // для права контаркта для поулчения NFT 
        return IERC721Receiver.onERC721Received.selector;
    }

    function _stake( // (OK :) )  
        address _asset,
        uint256 _amount
    ) internal override {
        _deposit(usdb.balanceOf(address(this)), usdPlus.balanceOf(address(this)), 0, 0, true);
    }

    function testDeposit() public {
        _deposit(usdb.balanceOf(address(this)), usdPlus.balanceOf(address(this)), 0, 0, true);
    }

    function testUnstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) public {
        _unstake(_asset, _amount, _beneficiary);
    }

    // 0.7 USDB = 708564556325646872
    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        require(_asset == address(usdb) || _asset == address(usdPlus), "Some tokens are not compatible");
        require(_amount > 0, "Amount is less than or equal to 0"); // 
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
            (uint160 sqrtRatioX96,,,,,,) = pool.slot0();
            (,,,,,, uint128 liquidity,,,,) = npm.positions(tokenLP);
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

    // (OK)
    function _deposit(uint256 amount0, uint256 amount1, uint256 lockedAmount0, uint256 lockedAmount1, bool zeroForOne) internal {
        // NOTE: Мб тут нужно добавить revert, если что-то равно нулю

        console.log("   usdbBalance: ", usdb.balanceOf(address(this)));
        console.log("   amount0: ", amount0);

        console.log("   usdPlusBalance: ", usdPlus.balanceOf(address(this)));
        console.log("   amount1: ", amount1);

        usdb.transfer(address(swapSimulator), amount0);
        usdPlus.transfer(address(swapSimulator), amount1);

        uint256 amountToSwap = _simulateSwap(amount0, amount1, zeroForOne); 

        if (amountToSwap > 0) {
            swapSimulator.swap(address(pool), 
                amountToSwap, 
                0, 
                zeroForOne, 
                sqrtRatioStablecoinsX96Min, 
                sqrtRatioStablecoinsX96Max
            );
        }

        swapSimulator.withdrawAll(address(pool));

        amount0 = usdb.balanceOf(address(this)) - lockedAmount0; // <---
        amount1 = usdPlus.balanceOf(address(this)) - lockedAmount1;     

        usdb.approve(address(npm), amount0);
        usdPlus.approve(address(npm), amount1);

        if (tokenLP == 0) {

            INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
                token0: pool.token0(), 
                token1: pool.token1(), 
                tickLower: tickRange[0],
                tickUpper: tickRange[1], 
                amount0Desired: amount0,
                amount1Desired: amount1,
                amount0Min: 0,
                amount1Min: 0,
                recipient: address(this),
                deadline: block.timestamp
            });
            (tokenLP,,,) = npm.mint(params);
        } else {
            // этот кейс еще не тестил (!!!)
            INonfungiblePositionManager.IncreaseLiquidityParams memory params = INonfungiblePositionManager.IncreaseLiquidityParams({
                tokenId: tokenLP,
                amount0Desired: amount0,
                amount1Desired: amount1,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp
            });
            npm.increaseLiquidity(params);
        }
    }

   
    function _withdraw(address asset, uint256 amount, bool isFull) internal returns (uint256) {
        (,,,,,, uint128 liquidity,,,,) = npm.positions(tokenLP);
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

        npm.decreaseLiquidity(params); // тут мы просто задаем суммы, которые после вместе с физами выведет npm.collect
       
        _claimFees();

        // на данный момент у нас чуть-чуть USDB и много USD+, а вывести мы хоти много USDB

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

                // нужно понять, сколько USD+ нужно поменять, чтобы получить хотя бы (amount - amountToStake0) USDB
                uint256 amountUsdPlusToSwap = _simulateSwap(amount0, amount1, false); 

                swapSimulator.swap(
                    address(pool), 
                    amount - amountToStake0 + 1000000000000000, // 10^15
                    0, 
                    false,
                    sqrtRatioStablecoinsX96Min,
                    sqrtRatioStablecoinsX96Max
                );
                swapSimulator.withdrawAll(address(pool));

                amountToStake0 = usdb.balanceOf(address(this)) - amount;
                amountToStake1 = usdPlus.balanceOf(address(this));

                lockedAmount0 = amount;
            }
            _deposit(amountToStake0, amountToStake1, lockedAmount0, lockedAmount1, false); 
        } else {
            npm.burn(tokenLP);
            tokenLP = 0;

            if (asset == address(usdb)) {
                amount = usdPlus.balanceOf(address(this));
                if (amount > 0) {
                    usdPlus.transfer(address(swapSimulator), amount);
                    swapSimulator.swap(
                        address(pool),
                        amount, 
                        0, 
                        false,
                        sqrtRatioStablecoinsX96Min,
                        sqrtRatioStablecoinsX96Max
                    );
                }
            } 
            
            swapSimulator.withdrawAll(address(pool));
        }
        return IERC20(asset).balanceOf(address(this));
    }


    function _simulateSwap(uint256 amount0, uint256 amount1, bool zeroForOne) internal returns (uint256 amountToSwap) {
        BinSearchParams memory binSearchParams;

        if (zeroForOne) { 
            uint256 token1_amount = IERC20(ICLPool(address(pool)).token1()).balanceOf(address(pool));
            binSearchParams.right = token1_amount > amount0 ? amount0 : token1_amount;
        } else { 
            uint256 token0_amount = IERC20(ICLPool(address(pool)).token0()).balanceOf(address(pool)); 
            binSearchParams.right = token0_amount > amount1 ? amount1 : token0_amount;
        }

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

                if (swapResult[3] == 0) {
                    binSearchParams.right = binSearchParams.mid;
                } else {

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
        }
        amountToSwap = binSearchParams.mid;
    }


    function _getSqrtPriceLimitX96(ICLPool _pool, uint256 _slippageBP, bool _zeroForOne) internal view returns (uint160) {
        (uint160 sqrtRatioX96,,,,,,) = _pool.slot0();
        
        if (_zeroForOne) {
            return sqrtRatioX96 * (10000 - uint160(_slippageBP)) / 10000;
        } else {
            return sqrtRatioX96 * (10000 + uint160(_slippageBP)) / 10000;
        }
    }

    function _compareRatios(uint256 a, uint256 b, uint256 c, uint256 d) internal pure returns (bool) {
        return a * d > b * c;
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {
        return 0;
    }

    function _claimFees() internal { 
        INonfungiblePositionManager.CollectParams memory collectParams = INonfungiblePositionManager.CollectParams({
            tokenId: tokenLP,
            recipient: address(this),
            amount0Max: type(uint128).max,
            amount1Max: type(uint128).max
        });
        npm.collect(collectParams);
    }

    function _reinvest() internal {
        _swapAllToUsdb();

        uint256 usdbBalance = usdb.balanceOf(address(this));
        _stake(address(usdb), usdbBalance);
    }

    function _swapAllToUsdb() internal {
        uint256 usdPlusBalance = usdPlus.balanceOf(address(this));
        uint256 fnxBalance = fnx.balanceOf(address(this));

        if (usdPlusBalance > 0) {
            (uint160 sqrtRatioUsdbUsdPlusX96,,,,,,) = poolUsdbUsdPlus.slot0(); 
            usdPlus.transfer(address(swapSimulator), usdPlusBalance);
            swapSimulator.swap(
                address(poolUsdbUsdPlus), 
                usdPlusBalance, 
                0, 
                false,
                sqrtRatioUsdbUsdPlusX96 * uint160((10000 - rewardSwapSlippageBP) / 10000),
                sqrtRatioUsdbUsdPlusX96 * uint160((10000 + rewardSwapSlippageBP) / 10000)
            );
            swapSimulator.withdrawAll(address(poolUsdbUsdPlus));
        }

        if (fnxBalance > 0) {
            (uint160 sqrtRatioFnxUsdbX96,,,,,,) = poolFnxUsdb.slot0(); 
            fnx.transfer(address(swapSimulator), fnxBalance);
            swapSimulator.swap(
                address(poolFnxUsdb), 
                fnxBalance, 
                0, 
                true,
                sqrtRatioFnxUsdbX96 * uint160((10000 - rewardSwapSlippageBP) / 10000),
                sqrtRatioFnxUsdbX96 * uint160((10000 + rewardSwapSlippageBP) / 10000)
            );
            swapSimulator.withdrawAll(address(poolFnxUsdb)); 
        } 
    }


    function claimMerkleTreeRewards(address _beneficiary, bytes[] memory data, address chainAgnosticBundler) public { // onlyPortfolioAgent
        IChainAgnosticBundlerV2 bundler = IChainAgnosticBundlerV2(chainAgnosticBundler);

        bundler.multicall(data); 

        _reinvest();
    }

    function testCliamFees() public {
        uint256 usdbBefore = usdb.balanceOf(address(this));
        uint256 usdPlusBefore = usdPlus.balanceOf(address(this));

        _claimFees();

        uint256 usdbAfter = usdb.balanceOf(address(this));
        uint256 usdPlusAfter = usdPlus.balanceOf(address(this));

        console.log("USDB fees claimed: ", usdbAfter - usdbBefore);
        console.log("USDP fees claimed: ", usdPlusAfter - usdPlusBefore);
    }

    function testDeploy() public {
        console.log("DEBUG: StrategyFenixSwap - v2.0: unstake()");
    }
}

