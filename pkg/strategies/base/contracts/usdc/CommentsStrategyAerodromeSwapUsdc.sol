// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Aerodrome.sol";
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
        bool zeroForOne
    ) external;

    function simulateSwap(
        address pair,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96,
        bool zeroForOne,
        int24[] memory tickRange
    ) external;

    function uniswapV3SwapCallback( // коллбэк - типа то что должно быть выполненно после свапа?
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata _data
    ) external;

    function withdrawAll(address pair) external;
}

contract StrategyAerodromeSwapUsdc is Strategy, IERC721Receiver {

    IERC20 public usdc;
    IERC20 public usdcPlus;
    IERC20 public aero;

    int24[] public tickRange; 
    uint256 public binSearchIterations; 

    
    ICLPool public rewardSwapPool; 
    uint256 rewardSwapSlippageBP;

    ICLPool public pool;
    INonfungiblePositionManager public npm;
    ISwapSimulator public swapSimulator; 
    ICLGauge public gauge;

    uint256 public stakedTokenId; // NFTишка, подтверждающая что мы застейкали деньги
    
    address swapRouter;

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
        emit StrategyUpdatedParams();
    }

    // --- logic

    function netAssetValue() external view override returns (uint256) { 
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) { // что такое ликвидационная стоимость? 
        return _totalValue();
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    function _stake( // то есть на самом более корретное название - stakeAll? А текущее название сделано только для соотвествия интерфейсу?
    // (ведь мы не используем здесь _amount, а в _deposit передаем все деньги на контракте)
        address _asset,
        uint256 _amount
    ) internal override {
        _deposit(usdc.balanceOf(address(this)), usdcPlus.balanceOf(address(this)), 0, 0);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        require(_asset == address(usdc) || _asset == address(usdcPlus), "Some tokens are not compatible");                                                                
        require(_amount > 0, "Amount is 0");
        require(stakedTokenId != 0, "Not staked"); // то есть у нас есть NFT, подтверждающая что мы что-то застейкали

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

    // сколько конкретно мы застейкали + сколько есть на контракте
    function _totalValue() internal view returns (uint256) {
        uint256 amount0 = 0;
        uint256 amount1 = 0;

        if (stakedTokenId != 0) {
            (uint160 sqrtRatioX96,,,,,) = pool.slot0(); // текущая цена
            (,,,,,,, uint128 liquidity,,,,) = npm.positions(stakedTokenId); 
            // А случайно не liquidity == amount0 + amount1 ?
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



    // Note: СТРАТЕГИЯ САМА СТЕЙКАЕТ NFT ЧТОБЫ ПОЛУЧИТЬ РЕВАРДЫ

    function _claimRewards(address _beneficiary) internal override returns (uint256) {
        if (stakedTokenId == 0) { // если ничего не стейкли - то и ревардов у нас нет
            return 0;
        }
        uint256 balanceUsdcBefore = usdc.balanceOf(address(this));

        if (gauge.stakedContains(address(this), stakedTokenId)) { // ЛЕЖИТ ЛИ В ГАУДЖ НФТИШКА С НАШИМ ТОКЕНОМ
            gauge.withdraw(stakedTokenId); // (?) "Allows the user to receive fees instead of emissions" 
                                            // - то есть теперь (после вывода из гауджа) юзер будет получать физы, а не брайбы
        }
        _collect();

        // (?) в этот момент на баланс стратегии уже перечислены брайбы в Aero ?
        
        uint256 amountAero = aero.balanceOf(address(this));
        uint256 amountUsdcPlus = usdcPlus.balanceOf(address(this));

        if (amountAero > 0) {
            uint256 usdcAfterSwap = AerodromeLibrary.getAmountsOut( // смотрим, сколько USDC получим при обмене Aero на USDC
                swapRouter,
                address(aero),
                address(usdc),
                address(rewardSwapPool), // (?) Очев: пул, в котором мы будем менять Aero на Usdc
                amountAero
            );

            // если по рассчетам удастся что-то поменять
            if (usdcAfterSwap > 0) { // (?) а почему тут может вознинкуть количество меньше 0? Ведь сколько-то Aero у нас по-любому есть раз мы тут
                
                AerodromeLibrary.singleSwap( 
                    swapRouter,
                    address(aero),
                    address(usdc),
                    address(rewardSwapPool),
                    amountAero,
                    usdcAfterSwap * (10000 - rewardSwapSlippageBP) / 10000, // < amountOutMin >
                    address(this)
                );
            }
        }

        // (?) меняем все USDC+ на балансе на USDC в основном пуле (то есть в том, в который и будем потом вкладывать)
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

        swapSimulator.withdrawAll(address(pool)); // (?) выводим из обменника USDC, которые поменяли с плюсов на блансе в основном пуле 
        swapSimulator.withdrawAll(address(rewardSwapPool)); // (?) выводим из обменника USDC, которые поменяли с Aero на блансе в другом пуле (Aero / USDC)


        // Таким образом, В ДАННЫЙ МОМЕНТ мы вывели все реварды и поменяли их в USDC, а также поменяли все USDC+ на USDC
        //                сейчас на стратегии всё лежит в USDC
                            

        uint256 claimedUsdc = usdc.balanceOf(address(this)) - balanceUsdcBefore; 

        if (claimedUsdc > 0) { // (?) то есть мы переводим реварды (свопнутые в USDC) и USDC+ (свопнутые в USDC), которые были до получения ревардов
                              // как-то это странно
            usdc.transfer(_beneficiary, claimedUsdc);
        }


// --> (?) Что тут происходит?
        npm.approve(address(gauge), stakedTokenId);
        gauge.deposit(stakedTokenId); 
// -->

        return claimedUsdc;
    }

    // (?) Функция чтобы закинуть в пул?
    function _deposit(uint256 amount0, uint256 amount1, uint256 lockedAmount0, uint256 lockedAmount1) internal {
        // amount0 и amount1 - все USDC и USDC+ на балансе контракта


        // (?) что значит lockedAmount в данном контексте?

        usdc.transfer(address(swapSimulator), amount0);
        usdcPlus.transfer(address(swapSimulator), amount1);

        // считаем, сколько вложить, чтобы вложить максимум (так как при свопе цена изменится)
        (uint256 amountToSwap, bool zeroForOne) = _simulateSwap(amount0, amount1); // amount0 и amount1 - все USDC и USDC+ на балансе контракта


        // меняем рассчитанную ранее сумму того токена, которого больше
        if (amountToSwap > 0) {
            swapSimulator.swap(address(pool), amountToSwap, 0, zeroForOne);
        }
        swapSimulator.withdrawAll(address(pool)); 

        amount0 = usdc.balanceOf(address(this)) - lockedAmount0;
        amount1 = usdcPlus.balanceOf(address(this)) - lockedAmount1;

        usdc.approve(address(npm), amount0);
        usdcPlus.approve(address(npm), amount1);

        if (stakedTokenId == 0) { // если еще ничего не вложили в этот пул 
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
                recipient: address(this), // получатель NFTшки?
                deadline: block.timestamp,
                sqrtPriceX96: 0
            });
            (stakedTokenId,,,) = npm.mint(params);

            npm.approve(address(gauge), stakedTokenId);
            gauge.deposit(stakedTokenId); // стейкаем NFTшку

            emit Staked(stakedTokenId);
        } else { // то есть если уже что-то вложено в этом пуле?
            if (gauge.stakedContains(address(this), stakedTokenId)) {
                gauge.withdraw(stakedTokenId); // забираем старую NFT

            // (?) Получается, реварды там еще остаются 
            }

            INonfungiblePositionManager.IncreaseLiquidityParams memory params = INonfungiblePositionManager.IncreaseLiquidityParams({
                tokenId: stakedTokenId,
                amount0Desired: amount0, // "желаемая сумма"
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
        // 1. "Разстейкиваем" NFT позиции
        if (gauge.stakedContains(address(this), stakedTokenId)) {
            gauge.withdraw(stakedTokenId);
        }

        (,,,,,,, uint128 liquidity,,,,) = npm.positions(stakedTokenId);
        if (liquidity == 0) {
            return 0;
        }

        // 2. (?) Выводим все деньги из позиции
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

            // если хватает чисто USDC
            if (amountToStake0 > amount) { // типа если на стратегии в USDC денег больше, чем мы хотим вывести из пула?
                amountToStake0 -= amount;
                lockedAmount0 = amount;
                // типа откладываем нужную сумму с баланса стратегии на "lockedAmount0"



            } else { // меняем плюсы на обычные?
                usdcPlus.transfer(address(swapSimulator), amountToStake1);
                swapSimulator.swap(
                    address(pool), 
                    amount - amountToStake0, // столько, сколько не хватает USDC до amount 
                    // _getSqrtPriceLimitX96(pool, rewardSwapSlippageBP, false),
                    0, 
                    false
                );

                // (?) Разве после обмена не нужно сделать swapSimulator.withdrawAll(address(pool)); 
                // ведь на данный момент денбги вроде бы по-прежнему находятся в swapSimulator?
            }

            // и то что осталось, заново откладываем в пул 
            _deposit(amountToStake0, amountToStake1, lockedAmount0, lockedAmount1);

// (?) Таким образом вне зависимости от переданного в эту функцию asset, сумма будет по-любому выводиться в USDC

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

            // все деньги выведены из позиции и лежат в USDC на стратегии
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


// (?) Считаем, сколько USDC нужно поменять на USDC+, чтобы вложить в позицию всё
    function _simulateSwap(uint256 amount0, uint256 amount1) internal returns (uint256 amountToSwap, bool zeroForOne) {
        //                                                                              сколько            что менять

        zeroForOne = amount0 > amount1; 
        //           usdc      usdc+

        // (?) в каком смысле "zeroForOne"? Типа если usdc больше, то token1 (то есть USDC+) менять не нужно?


        BinSearchParams memory binSearchParams;
        binSearchParams.right = zeroForOne ? amount0 : amount1;

        // --------------------------------             --------------------------------         
        //                                ^                                            ^
        //                                |                                            |
        //                               usdc                                         usdc+
        
        for (uint256 i = 0; i < binSearchIterations; i++) {
            // а где устанавливается left?
            binSearchParams.mid = (binSearchParams.left + binSearchParams.right) / 2;

            if (binSearchParams.mid == 0) {
                break;
            }

            try swapSimulator.simulateSwap(
                address(pool),
                binSearchParams.mid,
                0,
                zeroForOne, // (?) то есть этот параметр определяет, что на что мы меняем?
                tickRange
            ) {} 


            catch Error(string memory reason) {
                emit SwapErrorInternal(reason);
                break;
            }

            // (типка после каждого try swapSimulator.simulateSwap, будет вызваться этот блок?) // если так, то странное решение
            catch (bytes memory _data) { 
                bytes memory data;

                assembly { // что это значит? :)
                    data := add(_data, 4)
                }

                uint256[] memory swapResult = new uint256[](4);

                // получается, из swapSimulator.simulateSwap мы получаем результаты в очень странном формате
                (swapResult[0], swapResult[1], swapResult[2], swapResult[3]) = abi.decode(data, (uint256, uint256, uint256, uint256));

                // (?)(?) Что значит swapResult[i] ?


                bool compareResult = zeroForOne ? 
                    _compareRatios(swapResult[0], swapResult[1], swapResult[2], swapResult[3]) : // если USDC на USDC+
                    _compareRatios(swapResult[1], swapResult[0], swapResult[3], swapResult[2]);  // если USDC+ на USDC
                    
                // _compareRatios: return a * d > b * c;


                if (compareResult) { // надо менять больше (то есть после обмена получается недостаточно USDC+)
                    binSearchParams.left = binSearchParams.mid;
                } else { // надо менять меньше
                    binSearchParams.right = binSearchParams.mid;
                }
            }
        }
        amountToSwap = binSearchParams.mid;
    }

// не используется в этой версии
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
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "!admin");
        _;
    }

    modifier onlyStrategy() {
        require(strategy == msg.sender, "!strategy");
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

        uint160 maxSqrtRatio = uint160(79236085330515764027303304732); // 1.0002
        uint160 minSqrtRatio = uint160(79224201403219477170569942574); // 0.999 TODO: change for more strict slippage

        pool.swap(
            address(this), 
            zeroForOne, 
            int256(amountIn), 
            sqrtPriceLimitX96 == 0
                ? (zeroForOne ? TickMath.MIN_SQRT_RATIO + 1 : TickMath.MAX_SQRT_RATIO - 1)
                : sqrtPriceLimitX96, 
            abi.encode(data)
        );

        (uint160 newSqrtRatioX96,,,,,) = pool.slot0();

        if (newSqrtRatioX96 > maxSqrtRatio || newSqrtRatioX96 < minSqrtRatio) {
            revert SlippageError(
                newSqrtRatioX96,
                minSqrtRatio,
                maxSqrtRatio
            );
        }
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
        if (token0.balanceOf(address(this)) > 0) {
            token0.transfer(msg.sender, token0.balanceOf(address(this)));
        }
        if (token1.balanceOf(address(this)) > 0) {
            token1.transfer(msg.sender, token1.balanceOf(address(this)));
        }
    }

    function _getProportion(
        ICLPool pool,
        int24[] memory tickRange
    ) internal view returns (uint256 token0Amount, uint256 token1Amount) {
        IERC20Metadata token0 = IERC20Metadata(pool.token0());
        IERC20Metadata token1 = IERC20Metadata(pool.token1());
        uint256 dec0 = 10 ** token0.decimals();
        uint256 dec1 = 10 ** token1.decimals();
        (uint160 sqrtRatioX96,,,,,) = pool.slot0();

        uint160 sqrtRatio0 = TickMath.getSqrtRatioAtTick(tickRange[0]);
        uint160 sqrtRatio1 = TickMath.getSqrtRatioAtTick(tickRange[1]);
        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(sqrtRatioX96, sqrtRatio0, sqrtRatio1, dec0 * 1000, dec1 * 1000);
        (token0Amount, token1Amount) = LiquidityAmounts.getAmountsForLiquidity(sqrtRatioX96, sqrtRatio0, sqrtRatio1, liquidity);
        uint256 denominator = dec0 > dec1 ? dec0 : dec1;

        token0Amount = token0Amount * (denominator / dec0);
        token1Amount = token1Amount * (denominator / dec1);
    }
}