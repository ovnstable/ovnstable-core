// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./core/Strategy.sol";
import "./exchanges/UniswapV2Exchange.sol";
import "./exchanges/BalancerExchange.sol";
import "./libraries/OvnMath.sol";
import "./connectors/meshswap/interfaces/IMeshSwapLP.sol";
import "./connectors/aave/interfaces/IPoolAddressesProvider.sol";
import "./connectors/aave/interfaces/IPriceFeed.sol";
import "./connectors/aave/interfaces/IPool.sol";

import "hardhat/console.sol";

contract StrategyBorrowMeshSwapUsdt is Strategy, UniswapV2Exchange, BalancerExchange {
    using OvnMath for uint256;

    uint256 constant MAX_UINT_VALUE = type(uint256).max;
    uint256 constant BALANCING_DELTA = 10 ** 16;

    IERC20 public usdcToken;
    IERC20 public usdtToken;
    IERC20 public aUsdcToken;
    IERC20 public meshToken;
    uint256 public usdcTokenDenominator;
    uint256 public usdtTokenDenominator;

    IMeshSwapLP public meshSwapUsdt;
    bytes32 public poolIdUsdcTusdDaiUsdt;

    IPoolAddressesProvider aavePoolAddressesProvider;
    IPriceFeed oracleChainlinkUsdc;
    IPriceFeed oracleChainlinkUsdt;
    uint8 eModeCategoryId;
    uint256 liquidationThreshold;
    uint256 healthFactor;


    // --- events

    event StrategyUpdatedTokens(address usdcToken, address usdtToken, address aUsdcToken, address meshToken, uint256 usdcTokenDenominator, uint256 usdtTokenDenominator);

    event StrategyUpdatedParams(address meshSwapUsdt, address meshSwapRouter, address balancerVault, bytes32 balancerPoolIdUsdcTusdDaiUsdt);

    event StrategyUpdatedAaveParams(address aavePoolAddressesProvider, address oracleChainlinkUsdc, address oracleChainlinkUsdt,
        uint256 eModeCategoryId, uint256 liquidationThreshold, uint256 healthFactor);


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
        address _aUsdcToken,
        address _meshToken
    ) external onlyAdmin {

        require(_usdcToken != address(0), "Zero address not allowed");
        require(_usdtToken != address(0), "Zero address not allowed");
        require(_aUsdcToken != address(0), "Zero address not allowed");
        require(_meshToken != address(0), "Zero address not allowed");

        usdcToken = IERC20(_usdcToken);
        usdtToken = IERC20(_usdtToken);
        aUsdcToken = IERC20(_aUsdcToken);
        meshToken = IERC20(_meshToken);
        usdcTokenDenominator = 10 ** IERC20Metadata(_usdcToken).decimals();
        usdtTokenDenominator = 10 ** IERC20Metadata(_usdtToken).decimals();

        emit StrategyUpdatedTokens(_usdcToken, _usdtToken, _aUsdcToken, _meshToken, usdcTokenDenominator, usdtTokenDenominator);
    }

    function setParams(
        address _meshSwapUsdt,
        address _meshSwapRouter,
        address _balancerVault,
        bytes32 _poolIdUsdcTusdDaiUsdt
    ) external onlyAdmin {

        require(_meshSwapUsdt != address(0), "Zero address not allowed");
        require(_meshSwapRouter != address(0), "Zero address not allowed");
        require(_balancerVault != address(0), "Zero address not allowed");
        require(_poolIdUsdcTusdDaiUsdt != "", "Empty pool id not allowed");

        meshSwapUsdt = IMeshSwapLP(_meshSwapUsdt);
        _setUniswapRouter(_meshSwapRouter);
        setBalancerVault(_balancerVault);
        poolIdUsdcTusdDaiUsdt = _poolIdUsdcTusdDaiUsdt;

        emit StrategyUpdatedParams(_meshSwapUsdt, _meshSwapRouter, _balancerVault, _poolIdUsdcTusdDaiUsdt);
    }

    function setAaveParams(
        address _aavePoolAddressesProvider,
        address _oracleChainlinkUsdc,
        address _oracleChainlinkUsdt,
        uint8 _eModeCategoryId,
        uint256 _liquidationThreshold,
        uint256 _healthFactor
    ) external onlyAdmin {

        require(_aavePoolAddressesProvider != address(0), "Zero address not allowed");
        require(_oracleChainlinkUsdc != address(0), "Zero address not allowed");
        require(_oracleChainlinkUsdt != address(0), "Zero address not allowed");

        aavePoolAddressesProvider = IPoolAddressesProvider(_aavePoolAddressesProvider);
        oracleChainlinkUsdc = IPriceFeed(_oracleChainlinkUsdc);
        oracleChainlinkUsdt = IPriceFeed(_oracleChainlinkUsdt);
        eModeCategoryId = _eModeCategoryId;
        liquidationThreshold = _liquidationThreshold * 10 ** 15;
        healthFactor = _healthFactor * 10 ** 15;

        emit StrategyUpdatedAaveParams(_aavePoolAddressesProvider, _oracleChainlinkUsdc, _oracleChainlinkUsdt,
            _eModeCategoryId, _liquidationThreshold, _healthFactor);
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
        console.log("stake");

        require(_asset == address(usdcToken), "Some token not compatible");

        swap(
            poolIdUsdcTusdDaiUsdt,
            IVault.SwapKind.GIVEN_IN,
            IAsset(address(usdcToken)),
            IAsset(address(usdtToken)),
            address(this),
            address(this),
            _amount,
            0
        );

        console.log("usdcBalance: %s", usdcToken.balanceOf(address(this)));
        uint256 usdtBalance = usdtToken.balanceOf(address(this));
        console.log("usdtBalance: %s", usdtBalance);
        usdtToken.approve(address(meshSwapUsdt), usdtBalance);
        meshSwapUsdt.depositToken(usdtBalance);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        console.log("unstake");

        require(_asset == address(usdcToken), "Some token not compatible");

        uint256 usdtBalanceFromUsdc = onSwap(
            poolIdUsdcTusdDaiUsdt,
            IVault.SwapKind.GIVEN_IN,
            usdcToken,
            usdtToken,
            _addBasisPoints(_amount)
        );
        console.log("usdtBalanceFromUsdc: %s", usdtBalanceFromUsdc);
        meshSwapUsdt.withdrawToken(usdtBalanceFromUsdc);
        console.log("usdtBalance withdrawed: %s", usdtToken.balanceOf(address(this)));

        swap(
            poolIdUsdcTusdDaiUsdt,
            IVault.SwapKind.GIVEN_IN,
            IAsset(address(usdtToken)),
            IAsset(address(usdcToken)),
            address(this),
            address(this),
            usdtBalanceFromUsdc,
            0
        );
        console.log("usdtBalance: %s", usdtToken.balanceOf(address(this)));
        console.log("usdcBalance: %s", usdcToken.balanceOf(address(this)));
        return usdcToken.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        console.log("unstakeFull");

        require(_asset == address(usdcToken), "Some token not compatible");

        //TODO fix count
        uint256 usdtTokenAmount = meshSwapUsdt.balanceOf(address(this)) * 2;
        console.log("usdtTokenAmount: %s", usdtTokenAmount);
        meshSwapUsdt.withdrawToken(usdtTokenAmount);

        swap(
            poolIdUsdcTusdDaiUsdt,
            IVault.SwapKind.GIVEN_IN,
            IAsset(address(usdtToken)),
            IAsset(address(usdcToken)),
            address(this),
            address(this),
            usdtTokenAmount,
            0
        );
        console.log("usdtBalance: %s", usdtToken.balanceOf(address(this)));
        console.log("usdcBalance: %s", usdcToken.balanceOf(address(this)));
        return usdcToken.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        //TODO fix count
        console.log("lpBalance: %s", meshSwapUsdt.balanceOf(address(this)));
        console.log("lpBalance * 2: %s", meshSwapUsdt.balanceOf(address(this)) * 2);
        return meshSwapUsdt.balanceOf(address(this)) * 2;
    }

    function liquidationValue() external view override returns (uint256) {
        //TODO fix count
        return meshSwapUsdt.balanceOf(address(this)) * 2;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        meshSwapUsdt.claimReward();

        // sell rewards
        uint256 totalUsdc;

        uint256 meshBalance = meshToken.balanceOf(address(this));
        if (meshBalance > 0) {
            uint256 meshUsdc = _swapExactTokensForTokens(
                address(meshToken),
                address(usdcToken),
                meshBalance,
                address(this)
            );
            totalUsdc += meshUsdc;
        }

        usdcToken.transfer(_to, usdcToken.balanceOf(address(this)));

        return totalUsdc;
    }

}
