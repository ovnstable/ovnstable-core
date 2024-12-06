// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Aerodrome.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract StrategyAerodromeSwapUsdc is Strategy, IERC721Receiver {

    IERC20 private usdc;
    IERC20 private usdcPlus;
    IERC20 private aero;

    int24[] private tickRange;
    uint256 private binSearchIterations;

    ICLPool private rewardSwapPool;
    uint256 private rewardSwapSlippageBP;

    ICLPool private pool;
    INonfungiblePositionManager private npm;
    ISwapSimulator private swapSimulator;
    ICLGauge private gauge;

    uint256 private stakedTokenId;
    address private swapRouter;
    address private treasury;
    uint256 private treasuryShare;

    // --- events
    event StrategyUpdatedParams();

    event SwapErrorInternal(string message);

    event Staked(uint256 tokenId);

    // --- structs

    struct StrategyParams {
        address pool;
        address rewardSwapPool;
        int24[] tickRange;
        uint256 binSearchIterations;
        address swapSimulatorAddress;
        address npmAddress;
        address aeroTokenAddress;
        uint256 rewardSwapSlippageBP;
        address swapRouter;
        address treasury;
        uint256 treasuryShare;
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
        rewardSwapPool = ICLPool(params.rewardSwapPool);
        tickRange = params.tickRange;
        
        binSearchIterations = params.binSearchIterations;
        swapSimulator = ISwapSimulator(params.swapSimulatorAddress);
        npm = INonfungiblePositionManager(params.npmAddress);
        gauge = ICLGauge(pool.gauge());
        aero = IERC20(params.aeroTokenAddress);
        rewardSwapSlippageBP = params.rewardSwapSlippageBP;
        swapRouter = params.swapRouter;
        treasury = params.treasury;
        treasuryShare = params.treasuryShare;
        emit StrategyUpdatedParams();
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
        _deposit(usdc.balanceOf(address(this)), usdcPlus.balanceOf(address(this)), 0, 0, true);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        require(_asset == address(usdc) || _asset == address(usdcPlus), "Some tokens are not compatible");
        require(_amount > 0, "Amount is 0");
        require(stakedTokenId != 0, "Not staked");

        return _withdraw(_asset, _amount, false);
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        require(_asset == address(usdc) || _asset == address(usdcPlus), "Some tokens are not compatible");
        require(stakedTokenId != 0, "Not staked");

        return _withdraw(_asset, 0, true);
    }

    function _totalValue() internal view returns (uint256) {
        uint256 amount0 = 0;
        uint256 amount1 = 0;

        if (stakedTokenId != 0) {
            (uint160 sqrtRatioX96,,,,,) = pool.slot0();
            (,,,,,,, uint128 liquidity,,,,) = npm.positions(stakedTokenId);
            (amount0, amount1) = LiquidityAmounts.getAmountsForLiquidity(
                sqrtRatioX96,
                TickMath.getSqrtRatioAtTick(tickRange[0]),
                TickMath.getSqrtRatioAtTick(tickRange[1]),
                liquidity
            );
        }
        uint256 totalValue = amount0 + amount1 + usdc.balanceOf(address(this)) + usdcPlus.balanceOf(address(this));
        return totalValue;
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {
        if (stakedTokenId == 0) {
            return 0;
        }
        uint256 balanceUsdcBefore = usdc.balanceOf(address(this));
        if (gauge.stakedContains(address(this), stakedTokenId)) {
            gauge.withdraw(stakedTokenId);
        }
        _collect();

        uint256 treasuryAmountAero = aero.balanceOf(address(this)) * treasuryShare / 10000;
        uint256 sellAmountAero = aero.balanceOf(address(this)) - treasuryAmountAero;
        uint256 amountUsdcPlus = usdcPlus.balanceOf(address(this));

        if (sellAmountAero > 0) {
            uint256 usdcAfterSwap = AerodromeLibrary.getAmountsOut(
                swapRouter,
                address(aero),
                address(usdc),
                address(rewardSwapPool),
                sellAmountAero
            );
            if (usdcAfterSwap > 0) {
                AerodromeLibrary.singleSwap(
                    swapRouter,
                    address(aero),
                    address(usdc),
                    address(rewardSwapPool),
                    sellAmountAero,
                    usdcAfterSwap * (10000 - rewardSwapSlippageBP) / 10000,
                    address(this)
                );
            }

            aero.transfer(treasury, treasuryAmountAero);
        }
        if (amountUsdcPlus > 0) {
            usdcPlus.transfer(address(swapSimulator), amountUsdcPlus);
            swapSimulator.swap(
                address(pool), 
                amountUsdcPlus, 
                // _getSqrtPriceLimitX96(pool, rewardSwapSlippageBP, false),
                0, 
                false
            );
        }
        swapSimulator.withdrawAll(address(pool));
        swapSimulator.withdrawAll(address(rewardSwapPool));
        uint256 claimedUsdc = usdc.balanceOf(address(this)) - balanceUsdcBefore;

        if (claimedUsdc > 0) {
            usdc.transfer(_beneficiary, claimedUsdc);
        }
        npm.approve(address(gauge), stakedTokenId);
        gauge.deposit(stakedTokenId);
        return claimedUsdc;
    }

    function _deposit(uint256 amount0, uint256 amount1, uint256 lockedAmount0, uint256 lockedAmount1, bool zeroForOne) internal {

        usdc.transfer(address(swapSimulator), amount0);
        usdcPlus.transfer(address(swapSimulator), amount1);

        uint256 amountToSwap = _simulateSwap(amount0, amount1, zeroForOne);

        if (amountToSwap > 0) {
            swapSimulator.swap(address(pool), amountToSwap, 0, zeroForOne);
        }

        swapSimulator.withdrawAll(address(pool));

        amount0 = usdc.balanceOf(address(this)) - lockedAmount0;
        amount1 = usdcPlus.balanceOf(address(this)) - lockedAmount1;

        usdc.approve(address(npm), amount0);
        usdcPlus.approve(address(npm), amount1);

        if (stakedTokenId == 0) {
            INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
                token0: pool.token0(),
                token1: pool.token1(),
                tickSpacing: pool.tickSpacing(),
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
            (stakedTokenId,,,) = npm.mint(params);

            npm.approve(address(gauge), stakedTokenId);
            gauge.deposit(stakedTokenId);

            emit Staked(stakedTokenId);
        } else {
            if (gauge.stakedContains(address(this), stakedTokenId)) {
                gauge.withdraw(stakedTokenId);
            }

            INonfungiblePositionManager.IncreaseLiquidityParams memory params = INonfungiblePositionManager.IncreaseLiquidityParams({
                tokenId: stakedTokenId,
                amount0Desired: amount0,
                amount1Desired: amount1,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp
            });
            npm.increaseLiquidity(params);
            npm.approve(address(gauge), stakedTokenId);
            gauge.deposit(stakedTokenId);
        }
    }

    function _withdraw(address asset, uint256 amount, bool isFull) internal returns (uint256) {
        if (gauge.stakedContains(address(this), stakedTokenId)) {
            gauge.withdraw(stakedTokenId);
        }

        (,,,,,,, uint128 liquidity,,,,) = npm.positions(stakedTokenId);
        if (liquidity == 0) {
            return 0;
        }

        INonfungiblePositionManager.DecreaseLiquidityParams memory params = INonfungiblePositionManager.DecreaseLiquidityParams({
            tokenId: stakedTokenId,
            liquidity: liquidity,
            amount0Min: 0,
            amount1Min: 0,
            deadline: block.timestamp
        });
        npm.decreaseLiquidity(params);
        _collect();

        if (!isFull) {
            uint256 amountToStake0 = usdc.balanceOf(address(this));
            uint256 amountToStake1 = usdcPlus.balanceOf(address(this));
            uint256 lockedAmount0;
            uint256 lockedAmount1;
            if (amountToStake0 > amount) {
                amountToStake0 -= amount;
                lockedAmount0 = amount;
            } else {
                usdcPlus.transfer(address(swapSimulator), amountToStake1);
                swapSimulator.swap(
                    address(pool), 
                    amount - amountToStake0, 
                    // _getSqrtPriceLimitX96(pool, rewardSwapSlippageBP, false),
                    0, 
                    false
                );
            }
            _deposit(amountToStake0, amountToStake1, lockedAmount0, lockedAmount1, false);
        } else {
            npm.burn(stakedTokenId);
            stakedTokenId = 0;

            if (asset == address(usdc)) {
                amount = usdcPlus.balanceOf(address(this));
                if (amount > 0) {
                    usdcPlus.transfer(address(swapSimulator), amount);
                    swapSimulator.swap(address(pool), amount, 0, false);
                }
            } 
            swapSimulator.withdrawAll(address(pool));
        }
        return IERC20(asset).balanceOf(address(this));
    }

    function _collect() internal {
        INonfungiblePositionManager.CollectParams memory collectParams = INonfungiblePositionManager.CollectParams({
            tokenId: stakedTokenId,
            recipient: address(this),
            amount0Max: type(uint128).max,
            amount1Max: type(uint128).max
        });
        npm.collect(collectParams);
    }

    function _simulateSwap(uint256 amount0, uint256 amount1, bool zeroForOne) internal returns (uint256 amountToSwap) {
        // usdc / usdc+
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
        (uint160 sqrtRatioX96,,,,,) = _pool.slot0();
        
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

