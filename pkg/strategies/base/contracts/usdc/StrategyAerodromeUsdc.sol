// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Aerodrome.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@overnight-contracts/core/contracts/interfaces/IExchange.sol";
import "hardhat/console.sol";

contract StrategyAerodromeUsdc is Strategy, IERC721Receiver {

    IERC20 public usdc;
    IERC20 public usdcPlus;
    IERC20 public aero;

    int24[] public tickRange;

    ICLPool public rewardSwapPool;
    uint256 rewardSwapSlippageBP;

    ICLPool public pool;
    INonfungiblePositionManager public npm;
    ICLGauge public gauge;

    uint256 public stakedTokenId;

    address public swapRouter;
    IExchange public exchange;

    // --- events
    event StrategyUpdatedParams();

    event SwapErrorInternal(string message);

    event Staked(uint256 tokenId);

    // --- structs

    struct StrategyParams {
        address pool;
        address rewardSwapPool;
        int24[] tickRange;
        address npmAddress;
        address aeroTokenAddress;
        uint256 rewardSwapSlippageBP;
        address swapRouter;
        address exchange;
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
        
        npm = INonfungiblePositionManager(params.npmAddress);
        gauge = ICLGauge(pool.gauge());
        aero = IERC20(params.aeroTokenAddress);
        rewardSwapSlippageBP = params.rewardSwapSlippageBP;
        swapRouter = params.swapRouter;
        exchange = IExchange(params.exchange);
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
        _deposit(usdc.balanceOf(address(this)), usdcPlus.balanceOf(address(this)), 0);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        require(_asset == address(usdc), "Some tokens are not compatible");
        require(_amount > 0, "Amount is 0");
        require(stakedTokenId != 0, "Not staked");

        return _withdraw(_amount, false);
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        require(_asset == address(usdc), "Some tokens are not compatible");
        require(stakedTokenId != 0, "Not staked");

        return _withdraw(0, true);
    }

    function _totalValue() internal view returns (uint256) {
        uint256 amount0;
        uint256 amount1;

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
        uint256 balanceUsdcPlusBefore = usdcPlus.balanceOf(address(this));
        if (gauge.stakedContains(address(this), stakedTokenId)) {
            gauge.withdraw(stakedTokenId);
        }
        _collect();

        uint256 amountAero = aero.balanceOf(address(this));
        uint256 amountUsdcPlus = usdcPlus.balanceOf(address(this)) - balanceUsdcPlusBefore;

        if (amountAero > 0) {
            uint256 usdcAfterSwap = AerodromeLibrary.getAmountsOut(
                swapRouter,
                address(aero),
                address(usdc),
                address(rewardSwapPool),
                amountAero
            );
            if (usdcAfterSwap > 0) {
                AerodromeLibrary.singleSwap(
                    swapRouter,
                    address(aero),
                    address(usdc),
                    address(rewardSwapPool),
                    amountAero,
                    usdcAfterSwap * (10000 - rewardSwapSlippageBP) / 10000,
                    address(this)
                );
            }
        }
        if (amountUsdcPlus > 0) {
            _redeem(amountUsdcPlus);
        }
        uint256 claimedUsdc = usdc.balanceOf(address(this)) - balanceUsdcBefore;

        if (claimedUsdc > 0) {
            usdc.transfer(_beneficiary, claimedUsdc);
        }
        npm.approve(address(gauge), stakedTokenId);
        gauge.deposit(stakedTokenId);
        return claimedUsdc;
    }

    function _deposit(uint256 _amount0, uint256 _amount1, uint256 _negativeAmount0) internal {
        (uint256 amount0, uint256 amount1) = _rebalance(_amount0, _amount1, _negativeAmount0);
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

    function _withdraw(uint256 amount, bool isFull) internal returns (uint256) {
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
            _deposit(usdc.balanceOf(address(this)), usdcPlus.balanceOf(address(this)), amount);
        } else {
            npm.burn(stakedTokenId);
            stakedTokenId = 0;
            _redeem(usdcPlus.balanceOf(address(this)));
        }
        return usdc.balanceOf(address(this));
    }

    function _mint(uint256 amount) internal {
        if (amount == 0) {
            return;
        }
        usdc.approve(address(exchange), amount);
        IExchange.MintParams memory params = IExchange.MintParams({
            asset: address(usdc),
            amount: amount,
            referral: ""
        });
        uint256 _amount = exchange.mint(params);
        require(_amount == amount, "mint amount != requested amount");
    }

    function _redeem(uint256 amount) internal {
        if (amount == 0) {
            return;
        }
        uint256 _amount = exchange.redeem(address(usdc), amount);
        require(_amount == amount, "redeem amount != requested amount");
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

    function _rebalance(
        uint256 amount0,
        uint256 amount1,
        uint256 negativeAmount0
    ) internal returns (uint256 newAmount0, uint256 newAmount1) {
        require(amount0 + amount1 > negativeAmount0, "Negative rebalance");
        (uint256 ratio0, uint256 ratio1) = _getProportion();

        if (negativeAmount0 < amount0) {
            amount0 -= negativeAmount0;
            negativeAmount0 = 0;
        } else {
            negativeAmount0 -= amount0;
            amount0 = 0;
        }
        uint256 totalValue = amount0 + amount1 - negativeAmount0;
        newAmount0 = FullMath.mulDiv(totalValue, ratio0, ratio0 + ratio1) + negativeAmount0;
        newAmount1 = FullMath.mulDiv(totalValue, ratio1, ratio0 + ratio1);

        if (amount0 > newAmount0) {
            _mint(amount0 - newAmount0);
        } else {
            _redeem(amount1 - newAmount1);
        }
    }

    function _getProportion() internal view returns (uint256 token0Amount, uint256 token1Amount) {
        uint256 dec0 = 10 ** IERC20Metadata(address(usdc)).decimals();
        uint256 dec1 = 10 ** IERC20Metadata(address(usdcPlus)).decimals();
        (uint160 sqrtRatioX96,,,,,) = pool.slot0();

        uint160 sqrtRatio0 = TickMath.getSqrtRatioAtTick(tickRange[0]);
        uint160 sqrtRatio1 = TickMath.getSqrtRatioAtTick(tickRange[1]);
        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(sqrtRatioX96, sqrtRatio0, sqrtRatio1, dec0 * 1000, dec1 * 1000);
        (token0Amount, token1Amount) = LiquidityAmounts.getAmountsForLiquidity(sqrtRatioX96, sqrtRatio0, sqrtRatio1, liquidity);
        uint256 denominator = dec0 > dec1 ? dec0 : dec1;

        token0Amount = token0Amount * (denominator / dec0);
        token1Amount = token1Amount * (denominator / dec1);
    }

    function _hotFix(address _beneficiary) external { // add modifier
        if (gauge.stakedContains(address(this), stakedTokenId)) {
            gauge.withdraw(stakedTokenId);
        }

        (,,,,,,, uint128 liquidity,,,,) = npm.positions(stakedTokenId);
        // if (liquidity == 0) {
        //     return 0;
        // }

        INonfungiblePositionManager.DecreaseLiquidityParams memory params = INonfungiblePositionManager.DecreaseLiquidityParams({
            tokenId: stakedTokenId,
            liquidity: liquidity,
            amount0Min: 0,
            amount1Min: 0,
            deadline: block.timestamp
        });
        npm.decreaseLiquidity(params);
        _collect();

        // uint usdcPlusBalance = usdcPlus.balanceOf(address(this));
        // exchange.redeem(address(usdc), usdcPlusBalance);
        usdc.transfer(_beneficiary, usdc.balanceOf(address(this)));  
        usdcPlus.transfer(_beneficiary, usdcPlus.balanceOf(address(this)));      
    }
}
