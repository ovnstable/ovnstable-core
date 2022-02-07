// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "../interfaces/IStrategy.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../connectors/curve/interfaces/IRewardOnlyGauge.sol";
import "../connectors/curve/interfaces/iCurvePool.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "../connectors/aave/interfaces/ILendingPoolAddressesProvider.sol";
import "../connectors/aave/interfaces/ILendingPool.sol";
import "../connectors/swaps/interfaces/IUniswapV2Router01.sol";
import "../connectors/swaps/interfaces/IUniswapV2Pair.sol";
import "../libraries/math/LowGasSafeMath.sol";

import "hardhat/console.sol";

contract StrategyQsMaiUsdt is IStrategy, AccessControlUpgradeable, UUPSUpgradeable{
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant PORTFOLIO_MANAGER = keccak256("UPGRADER_ROLE");


    using LowGasSafeMath for uint256;
    uint256 public constant minimumAmount = 1000;

    IUniswapV2Router01 public router;
    IUniswapV2Pair public pair;
    IERC20 public mai;
    IERC20 public usdt;
    IERC20 public usdc;

    // --- events

    event ConnectorQuickswapUsdtMai(address router, address pair, address mai, address usdt, address usdc);




    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(UPGRADER_ROLE)
    override
    {}


    // ---  modifiers

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    modifier onlyPortfolioManager() {
        require(hasRole(PORTFOLIO_MANAGER, msg.sender), "Restricted to PORTFOLIO_MANAGER");
        _;
    }



    // --- setters

    function setParameters(
        address _mai,
        address _usdt,
        address _usdc,
        address _router,
        address _pair
    ) external onlyAdmin{
        require(_mai != address(0), "Zero address not allowed");
        require(_usdt != address(0), "Zero address not allowed");
        require(_usdc != address(0), "Zero address not allowed");
        require(_router != address(0), "Zero address not allowed");
        require(_pair!= address(0), "Zero address not allowed");

        router = IUniswapV2Router01(_router);
        pair = IUniswapV2Pair(_pair);
        mai = IERC20(_mai);
        usdt = IERC20(_usdt);
        usdc = IERC20(_usdc);
        emit ConnectorQuickswapUsdtMai(_router, _pair, _mai, _usdt, _usdc);
    }



    // --- logic

    function stake(
        address _asset,
        uint256 _amount
    ) override external onlyPortfolioManager {
        require(address(usdc) == _asset, 'ConnectorQuickswapUsdtMai: can work only with USDC');

        (uint256 reserveA, uint256 reserveB,) = pair.getReserves();
        console.log('Reserve A: %s, %s', pair.token0(), reserveA / 10 ** 18);
        console.log('Reserve B: %s, %s', pair.token1(), reserveB / 10 ** 6);
        require(reserveA > minimumAmount && reserveB > minimumAmount, 'ConnectorQuickswapUsdtMai: Liquidity pair reserves too low');

        uint256 swapAmountUSDT = _swapToUSDT(_amount);
        console.log('Swap amount USDT: input usdc: %s , output usdt: %s', _amount, swapAmountUSDT);

        uint256 amountMAI = _getSwapAmount(swapAmountUSDT, reserveB, reserveA);
        uint256 swapAmountMAI = _swapToMAI(amountMAI);

        console.log('Stake amount before');
        console.log('Amount MAI: %s', mai.balanceOf(address(this))/ 10 ** 18);
        console.log('Amount USDT: %s', usdt.balanceOf(address(this))/ 10 ** 6);
        console.log('Amount USDC: %s', usdc.balanceOf(address(this))/ 10 ** 6);
        console.log('Amount LP: %s', pair.balanceOf(address(this))/ 10** 18);

        _addLiquidity();

        console.log('Stake amount after');
        console.log('Amount MAI: %s', mai.balanceOf(address(this))/ 10 ** 18);
        console.log('Amount USDT: %s', usdt.balanceOf(address(this))/ 10 ** 6);
        console.log('Amount USDC: %s', usdc.balanceOf(address(this))/ 10 ** 6);
        console.log('Amount LP: %s', pair.balanceOf(address(this))/ 10** 18);


    }

    function unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) override external onlyPortfolioManager returns (uint256) {

        console.log('Unstake amount before');
        console.log('Amount MAI: %s', mai.balanceOf(address(this))/ 10 ** 18);
        console.log('Amount USDT: %s', usdt.balanceOf(address(this))/ 10 ** 6);
        console.log('Amount USDC: %s', usdc.balanceOf(address(this))/ 10 ** 6);
        console.log('Amount LP: %s', pair.balanceOf(address(this))/ 10** 18);

        pair.approve(address(router), _amount);

        (uint amountA, uint amountB) = router.removeLiquidity(pair.token0(), pair.token1(), _amount, 0, 0, address(this), block.timestamp + 600);
        console.log('Unstake amount after');
        console.log('Amount MAI: %s', mai.balanceOf(address(this))/ 10 ** 18);
        console.log('Amount USDT: %s', usdt.balanceOf(address(this))/ 10 ** 6);
        console.log('Amount USDC: %s', usdc.balanceOf(address(this))/ 10 ** 6);
        console.log('Amount LP: %s', pair.balanceOf(address(this))/ 10** 18);

        _swapToUSDC();
        console.log('Swap to USDC after');

        console.log('Amount MAI: %s', mai.balanceOf(address(this))/ 10 ** 18);
        console.log('Amount USDT: %s', usdt.balanceOf(address(this))/ 10 ** 6);
        console.log('Amount USDC: %s', usdc.balanceOf(address(this))/ 10 ** 6);
        console.log('Amount LP: %s', pair.balanceOf(address(this))/ 10** 18);
    }

    function _addLiquidity() private {

        address[] memory path = new address[](2);
        path[0] = address(mai);
        path[1] = address(usdt);

        uint256 amountUSDT = usdt.balanceOf(address(this));
        uint256 amountMAI = mai.balanceOf(address(this));
        usdt.approve(address(router), amountUSDT);
        mai.approve(address(router), amountMAI);

        (,, uint256 amountLiquidity) = router.addLiquidity(path[0], path[1], amountMAI, amountUSDT, 1, 1, address(this), block.timestamp+ 600);

        console.log('Amount liq: %s', amountLiquidity);
    }

    function _swapToMAI(uint256 amount)private returns(uint256 swapAmount) {

        address[] memory path = new address[](2);
        path[0] = address(usdt);
        path[1] = address(mai);

        uint[] memory amountsOut = router.getAmountsOut(amount, path);

        usdt.approve(address(router), amount);

        uint256[] memory swapedAmounts = router.swapExactTokensForTokens(
            amount, //    uint amountIn,
            0, //          uint amountOutMin,
            path,
            address(this),
            block.timestamp + 600 // 10 mins
        );

        return swapedAmounts[1];
    }


    function _swapToUSDC() private returns(uint256 swapAmount) {

        address[] memory path = new address[](2);
        path[0] = address(usdt);
        path[1] = address(usdc);

        uint256 amountUSDT = usdt.balanceOf(address(this));
        usdt.approve(address(router), amountUSDT);

        uint256[] memory swapedAmountsUSDT = router.swapExactTokensForTokens(
            amountUSDT, //    uint amountIn,
            0, //          uint amountOutMin,
            path,
            address(this),
            block.timestamp + 600 // 10 mins
        );

        path[0] = address(mai);
        path[1] = address(usdc);

        uint256 amountMAI = mai.balanceOf(address(this));
        mai.approve(address(router), amountMAI);

        uint256[] memory swapedAmountsMAI = router.swapExactTokensForTokens(
            amountMAI, //    uint amountIn,
            0, //          uint amountOutMin,
            path,
            address(this),
            block.timestamp + 600 // 10 mins
        );

        return swapedAmountsUSDT[1] + swapedAmountsMAI[1];
    }

    function _swapToUSDT(uint256 amount) private returns(uint256 swapAmount) {

        address[] memory path = new address[](2);
        path[0] = address(usdc);
        path[1] = address(usdt);

        uint[] memory amountsOut = router.getAmountsOut(amount, path);

        usdc.approve(address(router), amount);

        uint256[] memory swapedAmounts = router.swapExactTokensForTokens(
            amount, //    uint amountIn,
            0, //          uint amountOutMin,
            path,
            address(this),
            block.timestamp + 600 // 10 mins
        );

        return swapedAmounts[1];
    }

    function _getSwapAmount(uint256 investmentA, uint256 reserveA, uint256 reserveB) private view returns (uint256 swapAmount) {
        uint256 halfInvestment = investmentA / 2;
        uint256 nominator = router.getAmountOut(halfInvestment, reserveA, reserveB);
        uint256 denominator = router.quote(halfInvestment, reserveA.add(halfInvestment), reserveB.sub(nominator));
//        swapAmount = investmentA.sub(Babylonian.sqrt(halfInvestment * halfInvestment * nominator / denominator));
        return swapAmount;
    }


    function netAssetValue() external view override returns (uint256){
        return 0;
    }

    function liquidationValue() external view override returns (uint256){
        return  0;
    }

    function claimRewards(address _to) external override onlyPortfolioManager returns (uint256){
        return 0;
    }


}
