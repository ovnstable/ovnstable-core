// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/Synapse.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

import "hardhat/console.sol";

contract StrategyUniV3DaiUsdt is Strategy, IERC721Receiver {

    // --- params

    IERC20 public usdc;
    IERC20 public usdt;
    IERC20 public dai;

    IPriceFeed public oracleUsdc;
    IPriceFeed public oracleUsdt;
    IPriceFeed public oracleDai;

    ISwap public synapse;

    INonfungiblePositionManager public npm;
    uint24 public fee;
    IUniswapV3Pool public pool;

    int24 public tickLower;
    int24 public tickUpper;

    uint256 public tokenId;

    uint256 public usdcDm;
    uint256 public usdtDm;
    uint256 public daiDm;

    uint256 allowedSlippageBp;

    // --- events
    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address usdc;
        address usdt;
        address dai;
        address oracleUsdc;
        address oracleUsdt;
        address oracleDai;
        address synapse;
        address npm;
        uint24 fee;
        address pool;
        int24 tickLower;
        int24 tickUpper;
        uint256 allowedSlippageBp;
    }


    // --- constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- setters

    function setParams(StrategyParams calldata params) external onlyAdmin {

        usdc = IERC20(params.usdc);
        usdt = IERC20(params.usdt);
        dai = IERC20(params.dai);

        oracleUsdc = IPriceFeed(params.oracleUsdc);
        oracleUsdt = IPriceFeed(params.oracleUsdt);
        oracleDai = IPriceFeed(params.oracleDai);

        synapse = ISwap(params.synapse);

        npm = INonfungiblePositionManager(params.npm);
        pool = IUniswapV3Pool(params.pool);
        fee = params.fee;
        tickLower = params.tickLower;
        tickUpper = params.tickUpper;

        allowedSlippageBp = params.allowedSlippageBp;

        dai.approve(address(npm), type(uint256).max);
        usdt.approve(address(npm), type(uint256).max);

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        console.log('1: USDC %s', usdc.balanceOf(address(this)));
        console.log('1: DAI  %s', dai.balanceOf(address(this)));
        console.log('1: USDT %s', usdt.balanceOf(address(this)));

        uint256 reserveDai = dai.balanceOf(address(pool));
        uint256 reserveUsdt = usdt.balanceOf(address(pool));

        console.log('Reserve DAI  %s', reserveDai);
        console.log('Reserve USDT %s', reserveUsdt);

        getPoolPrice();

        uint256 amountUsdcToDai = 0;
        console.log('USDC to DAI  %s', amountUsdcToDai);
        uint256 minDai = 0;

        SynapseLibrary.swap(
            synapse,
            address(usdc),
            address(dai),
            amountUsdcToDai,
            minDai
        );

        console.log('2: USDC %s', usdc.balanceOf(address(this)));
        console.log('2: DAI  %s', dai.balanceOf(address(this)));
        console.log('2: USDT %s', usdt.balanceOf(address(this)));

        uint256 amountUsdcToUsdt = _amount - amountUsdcToDai;
        uint256 minUsdt = 0;
        console.log('USDC to USDT %s', amountUsdcToUsdt);


        SynapseLibrary.swap(
            synapse,
            address(usdc),
            address(usdt),
            amountUsdcToUsdt,
            minUsdt
        );

        console.log('3: USDC %s', usdc.balanceOf(address(this)));
        console.log('3: DAI  %s', dai.balanceOf(address(this)));
        console.log('3: USDT %s', usdt.balanceOf(address(this)));

        uint256 daiAmount = dai.balanceOf(address(this));
        uint256 usdtAmount = usdt.balanceOf(address(this));

        uint256 daiMinAmount = OvnMath.subBasisPoints(daiAmount, allowedSlippageBp);
        uint256 usdtMinAmount = OvnMath.subBasisPoints(usdtAmount, allowedSlippageBp);

        console.log('minDAI  %s', daiMinAmount);
        console.log('minUSDT %s', usdtMinAmount);

        if (tokenId == 0) {

            INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
            token0 : address(dai),
            token1 : address(usdt),
            fee: fee,
            tickLower : tickLower,
            tickUpper : tickUpper,
            amount0Desired : daiAmount,
            amount1Desired : usdtAmount,
            amount0Min : 0,
            amount1Min : 0,
            recipient : address(this),
            deadline : block.timestamp
            });

            (tokenId,,,) = npm.mint(params);

        } else {
            INonfungiblePositionManager.IncreaseLiquidityParams memory params = INonfungiblePositionManager.IncreaseLiquidityParams({
            tokenId: tokenId,
            amount0Desired: daiAmount,
            amount1Desired: usdtAmount,
            amount0Min: daiMinAmount,
            amount1Min: usdtMinAmount,
            deadline: block.timestamp
            });

            npm.increaseLiquidity(params);

        }

        console.log('4: USDC %s', usdc.balanceOf(address(this)));
        console.log('4: DAI  %s', dai.balanceOf(address(this)));
        console.log('4: USDT %s', usdt.balanceOf(address(this)));

    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        return usdc.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        return 0;
    }

    function _getLiquidity() public view returns (uint256 daiBalance, uint256 usdtBalance) {
        if (tokenId > 0) {
            (,,,,,,,uint128 liquidity,,,,) = npm.positions(tokenId);
            if (liquidity > 0) {
                (uint160 sqrtRatioX96,,,,,,) = pool.slot0();
                uint160 sqrtRatioAX96 = TickMath.getSqrtRatioAtTick(tickLower);
                uint160 sqrtRatioBX96 = TickMath.getSqrtRatioAtTick(tickUpper);

                uint128 koef = 1e18;
                uint128 div = liquidity / koef;
                uint128 mod = liquidity - div * koef;

                (uint256 balance0div, uint256 balance1div) = LiquidityAmounts.getAmountsForLiquidity(sqrtRatioX96, sqrtRatioAX96, sqrtRatioBX96, koef);
                (uint256 balance0mod, uint256 balance1mod) = LiquidityAmounts.getAmountsForLiquidity(sqrtRatioX96, sqrtRatioAX96, sqrtRatioBX96, mod);

                daiBalance = balance1div * div + balance1mod;
                usdtBalance = balance0div * div + balance0mod;
            }
        }
    }

    function getPriceX96FromSqrtPriceX96(uint160 sqrtPriceX96) public pure returns(uint256 priceX96) {
        return FullMath.mulDiv(sqrtPriceX96, sqrtPriceX96, FixedPoint96.Q96);
    }

    function getPoolPrice() public view returns (uint256) {

        (uint160 sqrtPriceX96,,,,,,) = pool.slot0();

        uint256 price = (sqrtPriceX96 * 1e18 / FixedPoint96.Q96) ** 2;
        console.log('poolPrice    %s', price);

        console.log('DAI %s', )

        return 0;
    }

    function getPriceBySqrtRatio(uint160 sqrtRatio) public view returns (uint256) {
        uint256 price = FullMath.mulDiv(uint256(sqrtRatio) * 10**10, uint256(sqrtRatio) * 10**8, 2 ** (96+96));
        return price;
    }

    function sqrt(uint256 x) internal pure returns (uint256 y) {
        uint256 z = x / 2 + 1;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    function getPriceByTick(int24 tick) public view returns (uint256) {
        uint160 sqrtRatio = TickMath.getSqrtRatioAtTick(tick);
        uint256 price = FullMath.mulDiv(uint256(sqrtRatio) * 10**10, uint256(sqrtRatio) * 10**8, 2 ** (96+96));
        return price;
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {

        INonfungiblePositionManager.CollectParams memory collectParam = INonfungiblePositionManager.CollectParams(tokenId, address(this), type(uint128).max, type(uint128).max);
        npm.collect(collectParam);

        return 0;
    }

    function onERC721Received(address, address, uint256, bytes memory) public virtual override returns (bytes4) {
        return this.onERC721Received.selector;
    }

}
