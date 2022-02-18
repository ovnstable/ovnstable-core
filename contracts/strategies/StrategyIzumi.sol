// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./Strategy.sol";
import "../connectors/QuickswapExchange.sol";
import "../connectors/uniswapV3/INonfungiblePositionManager.sol";
import "../connectors/uniswapV3/IUniswapV3Pool.sol";
import "../connectors/izumi/MiningFixRangeBoost.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

import "../connectors/uniswapV3/ISwapRouterV3.sol";
import "../connectors/uniswapV3/LiquidityAmounts.sol";
import "../connectors/uniswapV3/INonfungiblePositionManager.sol";

contract StrategyIzumi is Strategy, QuickswapExchange, IERC721Receiver {

    uint160 internal constant MIN_SQRT_RATIO = 79188560314459151373725315960; // TickMath.getSqrtRatioAtTick(-10)
    uint160 internal constant MAX_SQRT_RATIO = 79267784519130042428790663799; // TickMath.getSqrtRatioAtTick(10)

    IERC20 public usdcToken;
    IERC20 public usdtToken;
    IERC20 public iziToken;
    IERC20 public yinToken;
    IERC20 public wethToken;

    IERC721 public uniswapToken;

    uint256 public usdcTokenDenominator;
    uint256 public usdtTokenDenominator;
    uint256 public iziTokenDenominator;
    uint256 public yinTokenDenominator;


    uint256 public tokenId;

    INonfungiblePositionManager public uniswapPositionManager;
    IUniswapV3Pool public uniswapV3Pool;
    MiningFixRangeBoost public izumiBoost;
    ISwapRouter public uniswapV3Router;


    // --- events

    event StrategyIdleUpdatedTokens(address usdcToken, address idleToken, address wmaticToken,
        uint256 usdcTokenDenominator, uint256 idleTokenDenominator, uint256 wmaticTokenDenominator);

    event StrategyIdleUpdatedParams(address uniswapRouter);

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setTokens(
        address _usdcToken,
        address _usdtToken,
        address _iziToken,
        address _yinToken,
        address _uniswapToken,
        address _wethToken
    ) external onlyAdmin {

        require(_usdcToken != address(0), "Zero address not allowed");
        require(_usdtToken != address(0), "Zero address not allowed");
        require(_iziToken != address(0), "Zero address not allowed");
        require(_yinToken != address(0), "Zero address not allowed");
        require(_uniswapToken != address(0), "Zero address not allowed");
        require(_wethToken != address(0), "Zero address not allowed");

        usdcToken = IERC20(_usdcToken);
        usdtToken = IERC20(_usdtToken);
        iziToken = IERC20(_iziToken);
        yinToken = IERC20(_yinToken);
        wethToken = IERC20(_wethToken);
        uniswapToken = IERC721(_uniswapToken);

        usdcTokenDenominator = 10 ** IERC20Metadata(_usdcToken).decimals();
        usdtTokenDenominator = 10 ** IERC20Metadata(_usdtToken).decimals();
        iziTokenDenominator = 10 ** IERC20Metadata(_iziToken).decimals();
        yinTokenDenominator = 10 ** IERC20Metadata(_yinToken).decimals();

    }

    function setParams(
        address _uniswapPositionManager,
        address _uniswapV3Pool,
        address _uniswapV2Router,
        address _izumiBoost,
        address _uniswapV3Router
    ) external onlyAdmin {

        require(_uniswapPositionManager != address(0), "Zero address not allowed");
        require(_uniswapV3Pool != address(0), "Zero address not allowed");
        require(_uniswapV2Router != address(0), "Zero address not allowed");
        require(_uniswapV3Router != address(0), "Zero address not allowed");
        require(_izumiBoost != address(0), "Zero address not allowed");

        uniswapPositionManager = INonfungiblePositionManager(_uniswapPositionManager);
        uniswapV3Pool = IUniswapV3Pool(_uniswapV3Pool);
        izumiBoost = MiningFixRangeBoost(_izumiBoost);
        uniswapV3Router = ISwapRouter(_uniswapV3Router);

        setUniswapRouter(_uniswapV2Router);
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
        require(_asset == address(usdcToken), "Some token not compatible");

        if (tokenId == 0) {
            // create NFT in UniswapV3
            mint(_amount);
        } else {
            addLiquidity(_amount);
        }
    }


    function removeLiquidity(uint256 _amount) internal {

        izumiBoost.withdraw(tokenId, false);


        (uint160 sqrtPriceX96,,,,,,) = uniswapV3Pool.slot0();

        (uint256 amountLiq0, uint256 amountLiq1) = LiquidityAmounts.getAmountsForLiquidity(
            sqrtPriceX96,
            MIN_SQRT_RATIO,
            MAX_SQRT_RATIO,
            uniswapV3Pool.liquidity());

        uint256 ratio = (amountLiq0 * 10 ** 18) / amountLiq1;

        uint256 usdtAmount = getNeedToByUsdt(_amount);
        uint256 usdcAmount = _amount - usdtAmount;

        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(sqrtPriceX96, MIN_SQRT_RATIO, MAX_SQRT_RATIO, usdcAmount, usdtAmount);
        INonfungiblePositionManager.DecreaseLiquidityParams memory params = INonfungiblePositionManager.DecreaseLiquidityParams(
            tokenId,
            liquidity,
            0,
            0,
            block.timestamp + 600
        );
        uniswapPositionManager.decreaseLiquidity(params);

        INonfungiblePositionManager.CollectParams memory collectParam = INonfungiblePositionManager.CollectParams(
            tokenId,
            address(this),
            type(uint128).max,
            type(uint128).max
        );

        uniswapPositionManager.collect(collectParam);

        swapTokenToUsdc(address(usdtToken), address(usdcToken), usdtTokenDenominator, address(this), address(this), usdtToken.balanceOf(address(this)));
    }

    function addLiquidity(uint256 _amount) internal {

        uint256 neededUsdtBalance = getNeedToByUsdt(_amount);
        uint256 currentUsdtBalance = usdtToken.balanceOf(address(this));

        if (currentUsdtBalance <= neededUsdtBalance) {
            neededUsdtBalance = neededUsdtBalance - currentUsdtBalance;
            swapTokenToUsdc(address(usdcToken), address(usdtToken), usdcTokenDenominator, address(this), address(this), neededUsdtBalance);
        }

        uint256 amount0Desired = usdcToken.balanceOf(address(this));
        uint256 amount1Desired = usdtToken.balanceOf(address(this));

        INonfungiblePositionManager.IncreaseLiquidityParams memory params = INonfungiblePositionManager.IncreaseLiquidityParams(
            tokenId,
            amount0Desired,
            amount1Desired,
            (amount0Desired * 99 / 100), // slippage 1%
            (amount1Desired * 99 / 100), // slippage 1%
            block.timestamp + 600
        );

        usdcToken.approve(address(uniswapPositionManager), amount0Desired);
        usdtToken.approve(address(uniswapPositionManager), amount1Desired);

        uniswapPositionManager.increaseLiquidity(params);
    }


    function getNeedToByUsdt(uint256 _amount) internal returns (uint256){

        (uint160 sqrtPriceX96,,,,,,) = uniswapV3Pool.slot0();

        (uint256 amountLiq0, uint256 amountLiq1) = LiquidityAmounts.getAmountsForLiquidity(
            sqrtPriceX96,
            MIN_SQRT_RATIO,
            MAX_SQRT_RATIO,
            uniswapV3Pool.liquidity());

        uint256 ratio = (amountLiq0 * 10 ** 18) / amountLiq1;

        uint256 usdcBalance = _amount;
        uint256 needUsdtValue = (usdcBalance * 10 ** 18) / (ratio + 10 ** 18);
        // t=N/(r+1)
        return needUsdtValue;
    }

    function mint(uint256 _amount) internal {

        uint256 neededUsdtBalance = getNeedToByUsdt(_amount);
        uint256 currentUsdtBalance = usdtToken.balanceOf(address(this));

        if (currentUsdtBalance <= neededUsdtBalance) {
            neededUsdtBalance = neededUsdtBalance - currentUsdtBalance;
            swapTokenToUsdc(address(usdcToken), address(usdtToken), usdcTokenDenominator, address(this), address(this), neededUsdtBalance);
        }

        uint256 amount0Desired = usdcToken.balanceOf(address(this));
        uint256 amount1Desired = usdtToken.balanceOf(address(this));

        INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams(
            address(usdcToken),
            address(usdtToken),
            uniswapV3Pool.fee(),
            - 10, // price 0.999
            10, // price 1.001
            amount0Desired,
            amount1Desired,
            (amount0Desired * 99 / 100), // slippage 1%
            (amount1Desired * 99 / 100), // slippage 1%
            address(this),
            block.timestamp + 600
        );

        usdcToken.approve(address(uniswapPositionManager), amount0Desired);
        usdtToken.approve(address(uniswapPositionManager), amount1Desired);

        (uint256 _tokenId,,,) = uniswapPositionManager.mint(params);

        tokenId = _tokenId;

        uniswapToken.approve(address(izumiBoost), _tokenId);
        izumiBoost.deposit(_tokenId, 0);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        require(_asset == address(usdcToken), "Some token not compatible");

        if (usdcToken.balanceOf(address(this)) <= _amount) {
            removeLiquidity(_amount);
        }

        return _amount;
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        require(_asset == address(usdcToken), "Some token not compatible");

        _claimRewards(address(this));

        if (tokenId != 0) {

            izumiBoost.withdraw(tokenId, false);

            (uint160 sqrtPriceX96,,,,,,) = uniswapV3Pool.slot0();
            (,,,,,,,uint128 liquidity,,,,) = uniswapPositionManager.positions(tokenId);


            (uint256 amountLiq0, uint256 amountLiq1) = LiquidityAmounts.getAmountsForLiquidity(
                sqrtPriceX96,
                MIN_SQRT_RATIO,
                MAX_SQRT_RATIO,
                liquidity);

            INonfungiblePositionManager.DecreaseLiquidityParams memory params = INonfungiblePositionManager.DecreaseLiquidityParams(
                tokenId,
                liquidity,
                (amountLiq0 * 99 / 100),
                (amountLiq1 * 99 / 100),
                block.timestamp + 600
            );
            (uint256 amount0, uint256 amount1) = uniswapPositionManager.decreaseLiquidity(params);

            (,,,,,,,uint128 liquidity1,,,,) = uniswapPositionManager.positions(tokenId);

            INonfungiblePositionManager.CollectParams memory collectParam = INonfungiblePositionManager.CollectParams(
                tokenId,
                address(this),
                type(uint128).max,
                type(uint128).max
            );

            uniswapPositionManager.collect(collectParam);
            uniswapPositionManager.burn(tokenId);

            tokenId = 0;
        }

        swapTokenToUsdc(address(usdtToken), address(usdcToken), usdtTokenDenominator, address(this), address(this), usdtToken.balanceOf(address(this)));
        return usdcToken.balanceOf(address(this));

    }

    function netAssetValue() external override view returns (uint256) {
        return getTotal();
    }

    function liquidationValue() external override view returns (uint256) {
        return getTotal();
    }

    function getTotal() internal view returns (uint256){

        if (tokenId == 0)
            return 0;

        (,,,,,,,uint128 liquidity,,,,) = uniswapPositionManager.positions(tokenId);
        (uint160 sqrtPriceX96,,,,,,) = uniswapV3Pool.slot0();


        (uint256 amountLiq0, uint256 amountLiq1) = LiquidityAmounts.getAmountsForLiquidity(
            sqrtPriceX96,
            MIN_SQRT_RATIO,
            MAX_SQRT_RATIO,
            liquidity);


        uint256 totalUsdc = usdcToken.balanceOf(address(this)) + amountLiq0;
        uint256 totalUsdt = usdtToken.balanceOf(address(this)) + amountLiq1;

        uint256 price = getUsdcBuyPrice(address(usdtToken), address(usdcToken), usdtTokenDenominator, totalUsdt) / 10 ** 6;

        return totalUsdc + (totalUsdt * price);
    }


    function _swapIziUsdc() internal returns (uint256) {

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams(
            address(iziToken),
            address(wethToken),
            3000, // pool fee 0.3%
            address(this),
            block.timestamp + 600,
            iziToken.balanceOf(address(this)),
            0,
            0
        );

        iziToken.approve(address(uniswapV3Router), iziToken.balanceOf(address(this)));
        uint256 amountOut = uniswapV3Router.exactInputSingle(params);


        params = ISwapRouter.ExactInputSingleParams(
            address(wethToken),
            address(usdcToken),
            500, // pool fee 0.05%
            address(this),
            block.timestamp + 600,
            wethToken.balanceOf(address(this)),
            0,
            0
        );

        wethToken.approve(address(uniswapV3Router), wethToken.balanceOf(address(this)));
        amountOut = uniswapV3Router.exactInputSingle(params);
        return amountOut;
    }

    function _swapYinUsdc() internal returns (uint256) {

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams(
            address(yinToken),
            address(wethToken),
            3000, // pool fee 0.3%
            address(this),
            block.timestamp + 600,
            yinToken.balanceOf(address(this)),
            0,
            0
        );

        yinToken.approve(address(uniswapV3Router), yinToken.balanceOf(address(this)));
        uint256 amountOut = uniswapV3Router.exactInputSingle(params);


        params = ISwapRouter.ExactInputSingleParams(
            address(wethToken),
            address(usdcToken),
            500, // pool fee 0.05%
            address(this),
            block.timestamp + 600,
            wethToken.balanceOf(address(this)),
            0,
            0
        );

        wethToken.approve(address(uniswapV3Router), wethToken.balanceOf(address(this)));
        amountOut = uniswapV3Router.exactInputSingle(params);
        return amountOut;
    }

    function _claimRewards(address _to) internal override returns (uint256) {
        izumiBoost.collectReward(tokenId);

        uint256 total = 0;
        total += _swapIziUsdc();
        total += _swapYinUsdc();

        return total;
    }

    /// @notice Used for ERC721 safeTransferFrom
    function onERC721Received(address, address, uint256, bytes memory)
    public
    virtual
    override
    returns (bytes4)
    {
        return this.onERC721Received.selector;
    }

}
