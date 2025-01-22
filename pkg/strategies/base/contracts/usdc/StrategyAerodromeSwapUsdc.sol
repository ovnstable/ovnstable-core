// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import {Strategy} from "@overnight-contracts/core/contracts/Strategy.sol";
import {ICLPool, IERC20, INonfungiblePositionManager, ICLGauge, TickMath, FullMath, LiquidityAmounts, AerodromeLibrary} from "@overnight-contracts/connectors/contracts/stuff/Aerodrome.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {ISwapSimulator} from "./../interfaces/ISwapSimulator.sol";


contract StrategyAerodromeSwapUsdc is Strategy, IERC721Receiver {

    IERC20 private usdc;
    IERC20 private usdcPlus;
    IERC20 private aero;

    int24[] private DELETED_1;
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

    int24 public lowerTick;
    int24 public upperTick;

    uint256 liquidityDecreaseDeviationBP;

    // --- events

    event StrategyUpdatedParams();
    event SwapErrorInternal(string message);
    event Staked(uint256 tokenId);

    error NotEnoughAssetBalance(uint256 amount, uint256 assetToLock);
    error UnappropriateSqrtRatioBeforeSwap(uint160 sqrtRatioX96, uint160 sqrtRatioUpperTick, int24 upperTick);


    // --- structs
    
    struct StrategyParams {
        address pool;
        address rewardSwapPool;
        uint256 binSearchIterations;
        address swapSimulatorAddress;
        address npmAddress;
        address aeroTokenAddress;
        uint256 rewardSwapSlippageBP;
        address swapRouter;
        address treasury;
        uint256 treasuryShare;
        int24 lowerTick;
        int24 upperTick;
        uint256 liquidityDecreaseDeviationBP;
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
        
        binSearchIterations = params.binSearchIterations;
        swapSimulator = ISwapSimulator(params.swapSimulatorAddress);
        npm = INonfungiblePositionManager(params.npmAddress);
        // gauge = ICLGauge(pool.gauge());
        aero = IERC20(params.aeroTokenAddress);
        rewardSwapSlippageBP = params.rewardSwapSlippageBP;
        swapRouter = params.swapRouter;
        treasury = params.treasury;
        treasuryShare = params.treasuryShare;

        lowerTick = params.lowerTick;
        upperTick = params.upperTick;
        liquidityDecreaseDeviationBP = params.liquidityDecreaseDeviationBP;

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

    function _stake(address, uint256) internal override {
        _deposit(0, true);
    }

    function _unstake(address _asset, uint256 _amount, address) internal override returns (uint256) {
        require(_asset == address(usdc), "");
        require(_amount > 0, ""); 
        require(stakedTokenId != 0, "");

        _withdraw(_amount, false);
        uint256 assetBalance = usdc.balanceOf(address(this));

        return assetBalance > _amount ? _amount : assetBalance;
    }

    function _unstakeFull(address _asset, address) internal override returns (uint256) {
        require(_asset == address(usdc) || _asset == address(usdcPlus), "");
        require(stakedTokenId != 0, "");

        _withdraw(0, true);

        return usdc.balanceOf(address(this));
    }

    function _totalValue() internal view returns (uint256) {
        uint256 amount0 = 0;
        uint256 amount1 = 0;

        if (stakedTokenId != 0) {
            (uint160 sqrtRatioX96,,,,,) = pool.slot0();
            (,,,,,,, uint128 liquidity,,,,) = npm.positions(stakedTokenId);
            (amount0, amount1) = LiquidityAmounts.getAmountsForLiquidity(
                sqrtRatioX96,
                TickMath.getSqrtRatioAtTick(lowerTick),
                TickMath.getSqrtRatioAtTick(upperTick),
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

        if (aero.balanceOf(address(this)) > 0) { 
            aero.transfer(address(swapSimulator), aero.balanceOf(address(this)));
            swapSimulator.distributeAero(address(aero), address(usdc), address(rewardSwapPool), swapRouter, treasury,rewardSwapSlippageBP,  treasuryShare);
        }

        uint256 amountUsdcPlus = usdcPlus.balanceOf(address(this));

        if (amountUsdcPlus > 0) {
            usdcPlus.transfer(address(swapSimulator), amountUsdcPlus);

            uint160 borderForSwap = TickMath.getSqrtRatioAtTick(upperTick);
            swapSimulator.swap(address(pool), amountUsdcPlus, borderForSwap, false);
        }

        swapSimulator.withdrawAll(address(pool));
        swapSimulator.withdrawAll(address(rewardSwapPool));
        uint256 claimedUsdc = usdc.balanceOf(address(this)) - balanceUsdcBefore;

        if (claimedUsdc > 0) {
            usdc.transfer(_beneficiary, claimedUsdc);
        }

        // npm.approve(address(gauge), stakedTokenId);
        // gauge.deposit(stakedTokenId);
        return claimedUsdc;
    }

    function _deposit(uint256 assetToLock, bool zeroForOne) internal {

        uint256 amount0 = usdc.balanceOf(address(this));
        if (amount0 >= assetToLock) {
            amount0 -= assetToLock;
        } else {
            revert NotEnoughAssetBalance(amount0, assetToLock);
        }

        uint256 amount1 = usdcPlus.balanceOf(address(this));

        usdc.transfer(address(swapSimulator), amount0);
        usdcPlus.transfer(address(swapSimulator), amount1);

        uint256 amountToSwap = _simulateSwap(zeroForOne);
        uint160 borderForSwap = TickMath.getSqrtRatioAtTick(zeroForOne ? lowerTick : upperTick);

        if (amountToSwap > 0) {
            swapSimulator.swap(address(pool), amountToSwap, borderForSwap, zeroForOne);
        }

        swapSimulator.withdrawAll(address(pool));

        amount0 = usdc.balanceOf(address(this)) - assetToLock;
        amount1 = usdcPlus.balanceOf(address(this));

        usdc.approve(address(npm), amount0);
        usdcPlus.approve(address(npm), amount1);


        if (stakedTokenId == 0) {
            INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
                token0: pool.token0(),
                token1: pool.token1(),
                tickSpacing: pool.tickSpacing(),
                tickLower: lowerTick,
                tickUpper: upperTick,
                amount0Desired: amount0,
                amount1Desired: amount1,
                amount0Min: 0,
                amount1Min: 0,
                recipient: address(this),
                deadline: block.timestamp,
                sqrtPriceX96: 0
            });
            (stakedTokenId,,,) = npm.mint(params);

            // npm.approve(address(gauge), stakedTokenId);
            // gauge.deposit(stakedTokenId);

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

            // npm.approve(address(gauge), stakedTokenId);
            // gauge.deposit(stakedTokenId);
        }
    }

    function _withdraw(uint256 amount, bool isFull) internal {
        if (gauge.stakedContains(address(this), stakedTokenId)) {
            gauge.withdraw(stakedTokenId);
        }

        (,,,,,,, uint128 liquidity,,,,) = npm.positions(stakedTokenId);
        if (liquidity == 0) {
            return;
        }

        (uint160 sqrtRatioX96,,,,,) = pool.slot0();
        (uint256 amount0, uint256 amount1) = LiquidityAmounts.getAmountsForLiquidity(
            sqrtRatioX96,
            TickMath.getSqrtRatioAtTick(lowerTick),
            TickMath.getSqrtRatioAtTick(upperTick),
            liquidity
        );

        uint128 requiredLiquidityWithReserve;

        if ((amount0 > 0 || amount1 > 0)  && !isFull) {
            uint128 requiredLiquidity = uint128(FullMath.mulDiv(
                uint256(liquidity),
                amount,
                (amount0 + amount1)
            ));

            requiredLiquidityWithReserve = uint128(FullMath.mulDiv(
                uint256(requiredLiquidity),
                (10000 + liquidityDecreaseDeviationBP),
                10000
            ));
            
            if (requiredLiquidityWithReserve > liquidity) {
                requiredLiquidityWithReserve = liquidity;
            }
        }

        INonfungiblePositionManager.DecreaseLiquidityParams memory params = INonfungiblePositionManager.DecreaseLiquidityParams({
            tokenId: stakedTokenId,
            liquidity: requiredLiquidityWithReserve,
            amount0Min: 0,
            amount1Min: 0,
            deadline: block.timestamp 
        });

        npm.decreaseLiquidity(params);
        _collect();

        if (isFull) {
            npm.burn(stakedTokenId);
            stakedTokenId = 0;

            amount = usdcPlus.balanceOf(address(this));
            if (amount > 0) {
                usdcPlus.transfer(address(swapSimulator), amount);
                swapSimulator.swap(address(pool), amount, TickMath.getSqrtRatioAtTick(upperTick), false);
                swapSimulator.withdrawAll(address(pool));
            }
            return;
        }
        
        uint256 amountToStake0 = usdc.balanceOf(address(this));
        uint256 amountToStake1 = usdcPlus.balanceOf(address(this));
        
        if (amountToStake0 >= amount) {
            _deposit(amount, false);
            return;
        }
        
        usdcPlus.transfer(address(swapSimulator), amountToStake1);
        
        uint256 amountUsdcPlusToSwap = _calculateAmountToSwap(amount - amountToStake0);
        (uint160 currentSqrtRatioX96,,,,,) = pool.slot0();
        
        if (currentSqrtRatioX96 > TickMath.getSqrtRatioAtTick(upperTick)) { 
            revert UnappropriateSqrtRatioBeforeSwap(currentSqrtRatioX96, TickMath.getSqrtRatioAtTick(upperTick), upperTick);
        }
        
        swapSimulator.swap(address(pool), amountUsdcPlusToSwap, TickMath.getSqrtRatioAtTick(upperTick), false);
        swapSimulator.withdrawAll(address(pool));
        
        _deposit(amount, false); 
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

    function _simulateSwap(bool zeroForOne) internal returns (uint256 amountToSwap) {
        uint256 amount0 = usdc.balanceOf(address(swapSimulator));
        uint256 amount1 = usdcPlus.balanceOf(address(swapSimulator));

        uint256 l = 0;
        uint256 r;
        uint256 mid;

        if (zeroForOne) {
            uint256 token1_amount = IERC20(ICLPool(address(pool)).token1()).balanceOf(address(pool));
            r = token1_amount > amount0 ? amount0 : token1_amount;
        } else { 
            uint256 token0_amount = IERC20(ICLPool(address(pool)).token0()).balanceOf(address(pool)); 
            r = token0_amount > amount1 ? amount1 : token0_amount;
        }

        for (uint256 i = 0; i < binSearchIterations; i++) {
            mid = (l + r) / 2;

            if (mid == 0) {
                break;
            }
            try swapSimulator.simulateSwap(address(pool), mid, zeroForOne, lowerTick, upperTick) {

            } catch Error(string memory reason) {
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
                    r = mid;
                } else {
                    bool compareResult = zeroForOne ? 
                    _compareRatios(swapResult[0], swapResult[1], swapResult[2], swapResult[3]) : 
                    _compareRatios(swapResult[1], swapResult[0], swapResult[3], swapResult[2]);

                    if (compareResult) {
                        l = mid;
                    } else {
                        r = mid;
                    }
                }
            }
        }
        amountToSwap = mid;
    }

    function _compareRatios(uint256 a, uint256 b, uint256 c, uint256 d) internal pure returns (bool) {
        return a * d > b * c;
    }

    // NOTE: Calculates amount of asset1 that needs to be swaped to get targetAmount for asset0
    function _calculateAmountToSwap(uint256 targetAmount0) internal returns (uint256 amountToSwap) {
        uint256 l = 0;
        uint256 r = usdcPlus.balanceOf(address(swapSimulator));
        uint256 mid;

        for (uint256 i = 0; i < binSearchIterations; i++) {
            mid = (l + r) / 2;

            if (mid == 0) {
                break;
            }

            try swapSimulator.simulateSwap(address(pool), mid, false, lowerTick, upperTick) {} 
            catch Error(string memory reason) {
                emit SwapErrorInternal(reason);
                break;
            }
            catch (bytes memory _data) {     
                bytes memory data;
                assembly {
                    data := add(_data, 4)
                }
        
                (uint256 amount0AfterSwap,,,) = abi.decode(data, (uint256, uint256, uint256, uint256)); 

                if (amount0AfterSwap > targetAmount0) {
                    r = mid;
                } else {
                    l = mid;
                }
            }
        }
        amountToSwap = r;
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

