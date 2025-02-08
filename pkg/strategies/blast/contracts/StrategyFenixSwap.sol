// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import {Strategy, IERC20} from "@overnight-contracts/core/contracts/Strategy.sol";
import {ICLPool, TickMath, LiquidityAmounts, INonfungiblePositionManager, IDistributor, FullMath} from "@overnight-contracts/connectors/contracts/stuff/Fenix.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {ISwapSimulator} from "./interfaces/ISwapSimulator.sol";

contract StrategyFenixSwap is Strategy, IERC721Receiver {

    IERC20 public usdb;
    IERC20 public usdPlus;
    IERC20 public fnx;

    int24[] public DELETED_1;
    uint256 public binSearchIterations;

    ICLPool private DELETED_2;
    ICLPool private poolFnxUsdb;

    uint256 rewardSwapSlippageBP;

    uint160 DELETED_3;
    uint160 DELETED_4;

    ICLPool public pool;
    INonfungiblePositionManager public npm;
    ISwapSimulator public swapSimulator;

    uint256 public tokenLP;
    int24 public lowerTick;
    int24 public upperTick;

    uint256 liquidityDecreaseDeviationBP;

    IERC20 private weth;
    ICLPool private poolFnxWeth;
    ICLPool private poolUsdbWeth;

    // --- events
    event StrategyUpdatedParams();
    event SwapErrorInternal(string message);
    event Staked(uint256 tokenId);

    error NotEnoughAssetBalance(uint256 amount, uint256 assetToLock);
    error UnappropriateSqrtRatioBeforeSwap(uint160 sqrtRatioX96, uint160 sqrtRatioUpperTick, int24 upperTick);

    // --- structs

    struct StrategyParams {
        address pool;
        uint256 binSearchIterations;
        address swapSimulatorAddress;
        address npmAddress;
        int24 lowerTick;
        int24 upperTick;
        address fnxTokenAddress;
        address wethTokenAddress;
        address poolFnxUsdb;
        address poolFnxWeth; 
        address poolUsdbWeth;
        uint256 rewardSwapSlippageBP;
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

        usdb = IERC20(pool.token0());
        usdPlus = IERC20(pool.token1());
        fnx = IERC20(params.fnxTokenAddress);
        weth = IERC20(params.wethTokenAddress);

        swapSimulator = ISwapSimulator(params.swapSimulatorAddress);
        npm = INonfungiblePositionManager(params.npmAddress);

        rewardSwapSlippageBP = params.rewardSwapSlippageBP;
        liquidityDecreaseDeviationBP = params.liquidityDecreaseDeviationBP;

        binSearchIterations = params.binSearchIterations;
        lowerTick = params.lowerTick;
        upperTick = params.upperTick;

        poolFnxUsdb = ICLPool(params.poolFnxUsdb);
        poolFnxWeth = ICLPool(params.poolFnxWeth);
        poolUsdbWeth = ICLPool(params.poolUsdbWeth);
        
        emit StrategyUpdatedParams();
    }

    function setLiquidityDecreaseDeviationBP(uint256 bps) public onlyPortfolioAgent {
        liquidityDecreaseDeviationBP = bps;
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
        require(_asset == address(usdb), "Some tokens are not compatible");
        require(_amount > 0, "Amount is less than or equal to 0"); 
        require(tokenLP != 0, "Not staked");

        _withdraw(_amount, false);
        uint256 assetBalance = usdb.balanceOf(address(this));

        return assetBalance > _amount ? _amount : assetBalance;
    }

    function _unstakeFull(address _asset, address) internal override returns (uint256) {
        require(_asset == address(usdb), "Some tokens are not compatible");
        require(tokenLP != 0, "Not staked");

        _withdraw(0, true);

        return usdb.balanceOf(address(this));
    }

    function _totalValue() internal view returns (uint256) {
        uint256 amount0 = 0;
        uint256 amount1 = 0;

        if (tokenLP != 0) {
            (uint160 sqrtRatioX96,,,,,) = pool.globalState();
            (,,,,,, uint128 liquidity,,,,) = npm.positions(tokenLP);
            (amount0, amount1) = LiquidityAmounts.getAmountsForLiquidity(
                sqrtRatioX96,
                TickMath.getSqrtRatioAtTick(lowerTick),
                TickMath.getSqrtRatioAtTick(upperTick),
                liquidity
            );
        }
        
        return amount0 + amount1 + usdb.balanceOf(address(this)) + usdPlus.balanceOf(address(this));
    }

    function _deposit(uint256 assetToLock, bool zeroForOne) internal {
        uint256 amount0 = usdb.balanceOf(address(this));
        if (amount0 >= assetToLock) {
            amount0 -= assetToLock;
        } else {
            revert NotEnoughAssetBalance(amount0, assetToLock);
        }

        uint256 amount1 = usdPlus.balanceOf(address(this));

        usdb.transfer(address(swapSimulator), amount0);
        usdPlus.transfer(address(swapSimulator), amount1);

        uint256 amountToSwap = _simulateSwap(zeroForOne);
        uint160 borderForSwap = TickMath.getSqrtRatioAtTick(zeroForOne ? lowerTick : upperTick);

        if (amountToSwap > 0) {
            swapSimulator.swap(address(pool), amountToSwap, borderForSwap, zeroForOne);
        }

        swapSimulator.withdrawAll(address(pool));        

        amount0 = usdb.balanceOf(address(this)) - assetToLock;
        amount1 = usdPlus.balanceOf(address(this));

        usdb.approve(address(npm), amount0);
        usdPlus.approve(address(npm), amount1);

        if (tokenLP == 0) {
            INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
                token0: pool.token0(), 
                token1: pool.token1(), 
                tickLower: lowerTick,
                tickUpper: upperTick, 
                amount0Desired: amount0,
                amount1Desired: amount1,
                amount0Min: 0,
                amount1Min: 0,
                recipient: address(this),
                deadline: block.timestamp
            });
            (tokenLP,,,) = npm.mint(params);
        } else {
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

    function _withdraw(uint256 amount, bool isFull) internal {
        (,,,,,, uint128 liquidity,,,,) = npm.positions(tokenLP);
        
        if (liquidity == 0) {
            return;
        }

        (uint160 sqrtRatioX96,,,,,) = pool.globalState();
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
            tokenId: tokenLP,
            liquidity: isFull ? liquidity : requiredLiquidityWithReserve,
            amount0Min: 0,
            amount1Min: 0,
            deadline: block.timestamp
        });
            
        npm.decreaseLiquidity(params);         
        
        _claimFees();

        if (isFull) {
            npm.burn(tokenLP);
            tokenLP = 0;

            amount = usdPlus.balanceOf(address(this));
            if (amount > 0) {
                usdPlus.transfer(address(swapSimulator), amount);
                swapSimulator.swap(address(pool), amount, TickMath.getSqrtRatioAtTick(upperTick), false);
                swapSimulator.withdrawAll(address(pool));
            }
            return;
        }

        uint256 amountToStake0 = usdb.balanceOf(address(this));
        uint256 amountToStake1 = usdPlus.balanceOf(address(this));

        if (amountToStake0 >= amount) {
            _deposit(amount, false);
            return;
        }

        usdPlus.transfer(address(swapSimulator), amountToStake1);
        
        uint256 amountUsdPlusToSwap = _calculateAmountToSwap(amount - amountToStake0);
        
        (uint160 newSqrtRatioX96,,,,,) = pool.globalState();
        
        if (newSqrtRatioX96 > TickMath.getSqrtRatioAtTick(upperTick)) { 
            revert UnappropriateSqrtRatioBeforeSwap(newSqrtRatioX96, TickMath.getSqrtRatioAtTick(upperTick), upperTick);
        }
        
        swapSimulator.swap(address(pool), amountUsdPlusToSwap, TickMath.getSqrtRatioAtTick(upperTick), false);
        swapSimulator.withdrawAll(address(pool));
        
        _deposit(amount, false); 
    }

    function _simulateSwap(bool zeroForOne) internal returns (uint256 amountToSwap) {
        uint256 amount0 = usdb.balanceOf(address(swapSimulator));
        uint256 amount1 = usdPlus.balanceOf(address(swapSimulator));

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

    // NOTE: Calculates amount of asset1 that needs to be swaped to get targetAmount for asset0
    function _calculateAmountToSwap(uint256 targetAmount0) internal returns (uint256 amountToSwap) {
        uint256 l = 0;
        uint256 r = usdPlus.balanceOf(address(swapSimulator));
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

    function _compareRatios(uint256 a, uint256 b, uint256 c, uint256 d) internal pure returns (bool) {
        return a * d > b * c;
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

    function _claimRewards(address _beneficiary) internal override returns (uint256) {
        return 0;
    }

    function _swapRewards() internal {
        fnx.transfer(address(swapSimulator), fnx.balanceOf(address(this)));     
        swapSimulator.swapRewards(address(fnx), address(weth), address(poolFnxWeth), address(poolUsdbWeth), rewardSwapSlippageBP);
    }

    function _reinvest() internal override { 
        _swapRewards();
        _stake(address(usdb), 0);
    }

    function _sendToTreshery(ClaimConfig memory claimConfig) internal override { 
        _swapRewards();
        usdb.transfer(claimConfig.beneficiary, usdb.balanceOf(address(this)));
    }

    function _custom(ClaimConfig memory claimConfig) internal override {
        revert("Not implemented");
    }
}