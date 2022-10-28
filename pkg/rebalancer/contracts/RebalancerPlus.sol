// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./libraries/LinearMath.sol";

import "@overnight-contracts/core/contracts/interfaces/IUsdPlusToken.sol";
import "@overnight-contracts/market/contracts/interfaces/IWrappedUsdPlusToken.sol";
import "@overnight-contracts/core/contracts/interfaces/IExchange.sol";

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "@overnight-contracts/connectors/contracts/stuff/Beethovenx.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";

import "hardhat/console.sol";

contract RebalancerPlus {
    using SafeERC20 for IERC20;

    uint256 private constant MAX_UINT = 2 ** 256 - 1;

    // такой же как в FixedMath
    uint256 constant private ONE = 10 ** 18;

    IVault public vault;
    IUniswapV3Pair public flashPool;

    // не врапированные токены
    IERC20 public asset;

    uint256 public poolFee; // at 1e5
    uint256 constant public poolFeeDenominator = 10 ** 5; // 100k ~ 100%



    constructor(
        address _balancerVault,
        address _asset,
        address _uniswapV3Pool,
        uint256 _poolFee
    ) {

        vault = IVault(_balancerVault);
        flashPool = IUniswapV3Pair(_uniswapV3Pool);
        asset = IERC20(_asset);
        poolFee = _poolFee;

        asset.approve(address(vault), MAX_UINT);
    }

    function rebalance(LinearPool _pool, uint256 _desiredBalance, bool _useFlash) public payable {

        console.log('Linear pool     %s', address(_pool));
        console.log('DesiredBalance  %s', _desiredBalance);
        console.log('UseFlash        %s', _useFlash);

        (
        IVault.SingleSwap memory _swap,
        uint256 _amountInNeededForSwap
        ) = getSwapAndAmountInNeeded(
            _pool, // пул с которым работаем
            _desiredBalance // желаемый баланс основного токена. Баланс не основного
        //                     (статик врапер) значения не имеет для пула и его не надо балансить
        );

//        // скока надо занять
//        uint256 _amountUsdcNeededForFlashLoan;
//
//        if (_swap.kind == IVault.SwapKind.GIVEN_IN) {
//            // мейн токен не требует корректировки и объем занимается как есть
//            _amountUsdcNeededForFlashLoan = _amountInNeededForSwap;
//        } else {
//            // для врапированного (статик) надо пересчитать
//            _amountUsdcNeededForFlashLoan = IStaticUsdPlusToken(address(_swap.assetIn)).staticToDynamicAmount(_amountInNeededForSwap);
//            _amountUsdcNeededForFlashLoan = _amountUsdcNeededForFlashLoan * 10000 / 9996 + 1;
//        }
//
//
//        // perform flash loan
//
//        // данные для передачи в колбэк флеша
//        bytes memory _swapData = abi.encode(
//            _swap, // описано что на что обменивать
//            _amountUsdcNeededForFlashLoan, // сколько занять
//            _amountInNeededForSwap, // сколько обменять
//            msg.sender // кто инициировал
//        );
//
//        if (_useFlash) {
//            // USDC в левой части (token0), а в правой USDT
//            // Uniswap -> {Usdc} -> this
//            USDC_USDT_POOL.flash(address(this), _amountUsdcNeededForFlashLoan, 0, _swapData);
//        } else {
//            // user -> {Usdc} -> this
//            IERC20(USDC).safeTransferFrom(msg.sender, address(this), _amountUsdcNeededForFlashLoan);
//            doSwap(_swap, _amountUsdcNeededForFlashLoan, _amountInNeededForSwap);
//        }
//
//        // возвращаем неиспользованное
//        uint256 balance = IERC20(USDC).balanceOf(address(this));
//        if (balance > 0) {
//            // this -> {Usdc} -> user
//            IERC20(USDC).transfer(msg.sender, balance);
//        }
    }

    function getPoolParams(LinearPool _pool) public view returns (LinearMath.Params memory _params){
        _params = LinearMath.Params(_pool.getSwapFeePercentage(), 0, 0);
        (_params.lowerTarget, _params.upperTarget) = _pool.getTargets();
    }

    function getSwapAndAmountInNeeded(LinearPool _pool, uint256 _desiredBalance) public view returns (IVault.SingleSwap  memory _swap, uint256 _amountInNeededForSwap) {
        LinearMath.Params memory _params = getPoolParams(_pool);
        uint256[] memory _scalingFactors = _pool.getScalingFactors();
        uint256 _mainTokenIndex = _pool.getMainIndex();
        uint256 _wrappedTokenIndex = _pool.getWrappedIndex();
        (IERC20[] memory _tokenAddresses, uint256[] memory _tokenBalances,) = vault.getPoolTokens(_pool.getPoolId());
        uint256 _mainTokenBalance = _tokenBalances[_mainTokenIndex];
        // ^^^ - данные из пула для расчетов


        // если желаемое значение не указано, то будет попытка привести к ближайшей границе
        // сверху или снизу в необходимый коридор
        if (_desiredBalance == 0) {
            uint256 _scaledUpperTarget = _params.upperTarget * ONE / _scalingFactors[_mainTokenIndex];
            uint256 _scaledLowerTarget = _params.lowerTarget * ONE / _scalingFactors[_mainTokenIndex];

            if (_mainTokenBalance > _scaledUpperTarget) {
                _desiredBalance = _scaledUpperTarget;
            } else if (_mainTokenBalance < _scaledLowerTarget) {
                _desiredBalance = _scaledLowerTarget;
            } else {
                revert("Already in range and no desired balance specified");
            }
        }

        //  токена меньше желаемого баланса
        if (_mainTokenBalance < _desiredBalance) {
            // USDC < desired
            uint256 _swapAmount = _desiredBalance - _mainTokenBalance;

            _swap = IVault.SingleSwap(
                _pool.getPoolId(),
                IVault.SwapKind.GIVEN_IN, // мы знаем сколько вносим
                IAsset(address(_tokenAddresses[_mainTokenIndex])), // вливаем основной токен
                IAsset(address(_tokenAddresses[_wrappedTokenIndex])), // вытягиваем врапированный
                _swapAmount, // объем вносимых токенов - USDC
                new bytes(0)
            );

            // объем для обмена
            _amountInNeededForSwap = _swapAmount;

        } else {
            // USDC >= desired
            uint256 _swapAmount = _mainTokenBalance - _desiredBalance;

            _swap = IVault.SingleSwap(
                _pool.getPoolId(),
                IVault.SwapKind.GIVEN_OUT, // мы знаем сколько надо вывести
                IAsset(address(_tokenAddresses[_wrappedTokenIndex])), // вливаем врапирвоанный
                IAsset(address(_tokenAddresses[_mainTokenIndex])), // вытягиваем основной токен
                _swapAmount, // объем выводимых токенов - USDC
                new bytes(0)
            );

            // считаем сколько надо врапированных (StaticUsdPlus) токенов для покрытия дельты основного токена
            _amountInNeededForSwap = getWrappedInForMainOut(
                _swapAmount,
                _mainTokenBalance * _scalingFactors[_mainTokenIndex] / ONE,
                _scalingFactors[_mainTokenIndex],
                _scalingFactors[_wrappedTokenIndex],
                _params
            );

        }

        return (_swap, _amountInNeededForSwap);
    }

    // Uniswap V3 Flash Callback
    function uniswapV3FlashCallback(uint256, uint256, bytes calldata _data) external payable {
        (
        IVault.SingleSwap  memory _swap, // описано что на что обменивать
        uint256 _initialAmount, // сколько заняли
        uint256 _requiredBalance, // сколько обменять
        address _msgSender // кто инициировал
        ) = abi.decode(
            _data,
            (IVault.SingleSwap, uint256, uint256, address)
        );
        address mainToken = address(_swap.kind == IVault.SwapKind.GIVEN_IN ? _swap.assetIn : _swap.assetOut);

        // пул один из ожидаемых
        require(msg.sender == address(flashPool), "bad 3. no");

        // проверяем что заем выдано _initialAmount на мейн токен
        require(IERC20(mainToken).balanceOf(address(this)) >= _initialAmount, "Flash loan didnt do it");

        // выполняем обмен, закодированный в переданных параметрах
        doSwap(_swap, _initialAmount, _requiredBalance);

        // подсчет количества токена для возврата займа +0.01%
        // процент указан на юнисвопе, например для DAI_POOL
        // https://info.uniswap.org/#/pools/0x5777d92f208679db4b9778590fa3cab3ac9e2168
        // и там указан 0.01%
        uint256 _repayment = _initialAmount + (_initialAmount * poolFee / poolFeeDenominator) + 1;

        uint256 _balance = IERC20(mainToken).balanceOf(address(this));
        if (_balance < _repayment) {
            // после свопа образовался дефицит
            uint256 _deficit = _repayment - _balance;
            // и его надо покрыть за счет вызывающего (_msgSender)
            IERC20(mainToken).safeTransferFrom(_msgSender, address(this), _deficit);
        }

        // после всего переводим на юнисвоп выплаты
        // сверка выплат на юнисвоп флешах проверяется по дельте баланса токена в пуле
        IERC20(mainToken).safeTransfer(msg.sender, _repayment);
    }


    // Usdc<->StaticUsdPlus swap
    function doSwap(IVault.SingleSwap memory swap, uint256 _initialAmount, uint256 _requiredBalance) private {

        IVault.FundManagement memory fundManagement = IVault.FundManagement(
            address(this),
            false,
            payable(address(this)),
            false
        );

        // on StaticUsdPlus -> Usdc
        if (swap.kind == IVault.SwapKind.GIVEN_OUT) {
            // перегоняем весь заемный баланс мейн токенов в статикАТокены
            require(IERC20(address(swap.assetOut)).balanceOf(address(this)) >= _initialAmount, "Not enough main asset to wrap");

            // Usdc->{wrap}->StaticUsdPlus
            wrapToken(address(swap.assetIn), _initialAmount);
        }

        require(IERC20(address(swap.assetIn)).balanceOf(address(this)) >= _requiredBalance, "Not enough asset in balance");

        uint256 limit = swap.kind == IVault.SwapKind.GIVEN_IN ? 0 : MAX_UINT;

        IERC20(address(swap.assetIn)).approve(address(vault), _requiredBalance);
        vault.swap(swap, fundManagement, limit, block.timestamp);

        // on Usdc -> StaticUsdPlus
        if (swap.kind == IVault.SwapKind.GIVEN_IN) {
            // перегоняем все оставшиеся статик токены в мейн токены
            // StaticUsdPlus->{unwrap}->Usdc
            unwrapToken(address(swap.assetOut), IERC20(address(swap.assetOut)).balanceOf(address(this)));
        }
    }

    // на врапированном токене (статик) вызываем депозит (так на статик токене)
    // таким образом перегоняем нативный токен (Usdc) в статикТокен
    // Usdc -> StaticUsdPlus
    function wrapToken(address _wrappedToken, uint256 _amount) private {
        address usdPlusToken = IWrappedUsdPlusToken(_wrappedToken).asset();
        address exchange = IUsdPlusToken(usdPlusToken).exchange();

        // Usdc -> UsdPlus
        asset.approve(exchange, _amount);
        uint256 buyAmount = IExchange(exchange).buy(address(asset), _amount);

        // UsdPlus -> StaticUsdPlus
        IERC20(usdPlusToken).approve(_wrappedToken, buyAmount);
        uint256 staticTokenResult = IWrappedUsdPlusToken(_wrappedToken).deposit(buyAmount, address(this));
    }

    // обратное к wrapToken, перегон статикТокенов в нативный токен (Usdc)
    // StaticUsdPlus -> Usdc
    function unwrapToken(address _wrappedToken, uint256 _amount) private {
        address mainToken = IWrappedUsdPlusToken(_wrappedToken).asset();
        address exchange = IUsdPlusToken(mainToken).exchange();

        // StaticUsdPlus -> UsdPlus
        uint256 redeemAmount = IWrappedUsdPlusToken(_wrappedToken).redeem(_amount, address(this), address(this));

        // UsdPlus -> Usdc
        uint256 resultAmount = IExchange(exchange).redeem(address(asset), redeemAmount);
    }


    function getWrappedInForMainOut(
        uint256 _mainOut,
        uint256 _mainBalance,
        uint256 _mainScalingFactor,
        uint256 _wrappedScalingFactor,
        LinearMath.Params memory _params
    ) public pure returns (uint256) {
        _mainOut = _mainOut * _mainScalingFactor / ONE;

        // по аналогии из свапов в пуле ааве, а пулы линейные и поэтому берем математику от пула
        uint256 amountIn = LinearMath._calcWrappedInPerMainOut(_mainOut, _mainBalance, _params);

        require(amountIn > 0, "amountIn can't be zero");

        return (((amountIn * ONE) - 1) / _wrappedScalingFactor) + 1;
    }

    function getWrappedOutForMainIn(
        uint256 _mainIn,
        uint256 _mainBalance,
        uint256 _mainScalingFactor,
        uint256 _wrappedScalingFactor,
        LinearMath.Params memory _params
    ) public pure returns (uint256) {
        _mainIn = _mainIn * _mainScalingFactor / ONE;

        uint256 amountOut = LinearMath._calcWrappedOutPerMainIn(_mainIn, _mainBalance, _params);

        return amountOut * ONE / _wrappedScalingFactor;
    }



    // функция оценки необходимого дефицита, перед вызовом ребалансирвоки
    function estimateDeficitRequirement(LinearPool _pool, uint256 _desiredBalance) external view returns (uint256) {
        (IVault.SingleSwap memory _swap, uint256 _amountInNeededForSwap) = getSwapAndAmountInNeeded(_pool, _desiredBalance);

        uint256 _amountNeededForFlashLoan;
        if (_swap.kind == IVault.SwapKind.GIVEN_IN) {
            _amountNeededForFlashLoan = _amountInNeededForSwap;
        } else {
            _amountNeededForFlashLoan = IWrappedUsdPlusToken(address(_swap.assetIn)).convertToAssets(_amountInNeededForSwap);
        }
        // +0.01%
        _amountNeededForFlashLoan += (_amountNeededForFlashLoan * poolFee / poolFeeDenominator) + 1;

        uint256 _amountOut = _swap.amount;
        if (_swap.kind == IVault.SwapKind.GIVEN_IN) {
            LinearMath.Params memory _params = getPoolParams(_pool);
            uint256[] memory _scalingFactors = _pool.getScalingFactors();
            uint256 _mainTokenIndex = _pool.getMainIndex();
            uint256 _wrappedTokenIndex = _pool.getWrappedIndex();
            (, uint256[] memory _tokenBalances,) = vault.getPoolTokens(_pool.getPoolId());
            uint256 _mainTokenBalance = _tokenBalances[_mainTokenIndex];

            _amountOut = getWrappedOutForMainIn(
                _swap.amount,
                _mainTokenBalance,
                _scalingFactors[_mainTokenIndex],
                _scalingFactors[_wrappedTokenIndex],
                _params
            );
            _amountOut = IWrappedUsdPlusToken(address(_swap.assetOut)).convertToAssets(_amountOut);
        }

        return _amountOut >= _amountNeededForFlashLoan ? 0 : _amountNeededForFlashLoan - _amountOut;
    }

    // функция оценки необходимого объема аппрувнуты средств, для снятия с вызывающего, перед вызовом ребалансирвоки
    function approveAmountRequirement(LinearPool _pool, uint256 _desiredBalance) external view returns (uint256, address) {
        (IVault.SingleSwap memory _swap, uint256 _amountInNeededForSwap) = getSwapAndAmountInNeeded(_pool, _desiredBalance);

        if (_swap.kind == IVault.SwapKind.GIVEN_IN) {
            // мейн токен не требует корректировки и объем занимается как есть
            return (_amountInNeededForSwap,address( _swap.assetIn));
        } else {
            // для врапированного (статик) надо пересчитать
            uint256 _amountUsdcNeeded = IWrappedUsdPlusToken(address(_swap.assetIn)).convertToAssets(_amountInNeededForSwap);
//            _amountUsdcNeeded = _amountUsdcNeeded * 10000 / 9996 + 1;
            return (_amountUsdcNeeded, address(_swap.assetIn));
        }
    }


    receive() payable external {}
}
