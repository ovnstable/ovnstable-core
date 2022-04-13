// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./core/Strategy.sol";
import "./exchanges/DodoExchange.sol";
import "./exchanges/BalancerExchange.sol";
import "./connectors/dodo/interfaces/IDODOV1.sol";
import "./connectors/dodo/interfaces/IDODOV2.sol";
import "./connectors/dodo/interfaces/IDODOMine.sol";

contract StrategyDodoUsdt is Strategy, DodoExchange, BalancerExchange {

    IERC20 public usdcToken;
    IERC20 public usdtToken;
    IERC20 public dodoToken;
    IERC20 public usdcLPToken;
    IERC20 public usdtLPToken;

    IDODOV1 public dodoV1UsdcUsdtPool;
    IDODOV2 public dodoV2DodoUsdtPool;
    IDODOMine public dodoMine;
    bytes32 public balancerPoolId;


    // --- events

    event StrategyDodoUpdatedTokens(address usdcToken, address usdtToken, address dodoToken, address usdcLPToken,
        address usdtLPToken);

    event StrategyDodoUpdatedParams(address dodoV1UsdcUsdtPool, address dodoV2DodoUsdtPool, address dodoMine,
        address dodoV1Helper, address dodoProxy, address dodoApprove, address balancerVault, bytes32 balancerPoolId);


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
        address _dodoToken,
        address _usdcLPToken,
        address _usdtLPToken
    ) external onlyAdmin {

        require(_usdcToken != address(0), "Zero address not allowed");
        require(_usdtToken != address(0), "Zero address not allowed");
        require(_dodoToken != address(0), "Zero address not allowed");
        require(_usdcLPToken != address(0), "Zero address not allowed");
        require(_usdtLPToken != address(0), "Zero address not allowed");

        usdcToken = IERC20(_usdcToken);
        usdtToken = IERC20(_usdtToken);
        dodoToken = IERC20(_dodoToken);
        usdcLPToken = IERC20(_usdcLPToken);
        usdtLPToken = IERC20(_usdtLPToken);

        emit StrategyDodoUpdatedTokens(_usdcToken, _usdtToken, _dodoToken, _usdcLPToken, _usdtLPToken);
    }

    function setParams(
        address _dodoV1UsdcUsdtPool,
        address _dodoV2DodoUsdtPool,
        address _dodoMine,
        address _dodoV1Helper,
        address _dodoProxy,
        address _dodoApprove,
        address _balancerVault,
        bytes32 _balancerPoolId
    ) external onlyAdmin {

        require(_dodoV1UsdcUsdtPool != address(0), "Zero address not allowed");
        require(_dodoV2DodoUsdtPool != address(0), "Zero address not allowed");
        require(_dodoMine != address(0), "Zero address not allowed");
        require(_dodoV1Helper != address(0), "Zero address not allowed");
        require(_dodoProxy != address(0), "Zero address not allowed");
        require(_dodoApprove != address(0), "Zero address not allowed");
        require(_balancerVault != address(0), "Zero address not allowed");
        require(_balancerPoolId != "", "Empty pool id not allowed");

        dodoV1UsdcUsdtPool = IDODOV1(_dodoV1UsdcUsdtPool);
        dodoV2DodoUsdtPool = IDODOV2(_dodoV2DodoUsdtPool);
        dodoMine = IDODOMine(_dodoMine);
        balancerPoolId = _balancerPoolId;

        setDodoParams(_dodoV1Helper, _dodoProxy, _dodoApprove);

        setBalancerVault(_balancerVault);

        emit StrategyDodoUpdatedParams(_dodoV1UsdcUsdtPool, _dodoV2DodoUsdtPool, _dodoMine, _dodoV1Helper, _dodoProxy,
            _dodoApprove, _balancerVault, _balancerPoolId);
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(usdcToken), "Some token not compatible");

        // swap usdc to usdt
        uint256 usdtTokenAmount = swap(balancerPoolId, IVault.SwapKind.GIVEN_IN, IAsset(address(usdcToken)),
            IAsset(address(usdtToken)), address(this), address(this), usdcToken.balanceOf(address(this)), 0);

        // add liquidity to pool
        usdtToken.approve(address(dodoV1UsdcUsdtPool), usdtTokenAmount);
        dodoV1UsdcUsdtPool.depositQuoteTo(address(this), usdtTokenAmount);

        // stake all lp tokens, because we unstake 0.1% tokens and don't stake them in _unstake() method
        uint256 usdtLPTokenBalance = usdtLPToken.balanceOf(address(this));
        usdtLPToken.approve(address(dodoMine), usdtLPTokenBalance);
        dodoMine.deposit(address(usdtLPToken), usdtLPTokenBalance);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        // get usdt amount
        uint256 usdtTokenAmount = onSwap(balancerPoolId, IVault.SwapKind.GIVEN_OUT, usdtToken, usdcToken, _amount);
        // need usdt amount >= _amount in usdc
        usdtTokenAmount = usdtTokenAmount * 1001 / 1000;

        // get lp tokens
        uint256 quoteLpTotalSupply = usdtLPToken.totalSupply();
        (, uint256 quoteTarget) = dodoV1UsdcUsdtPool.getExpectedTarget();
        uint256 quoteLpBalance = usdtTokenAmount * quoteLpTotalSupply / quoteTarget;
        // need for smooth withdraw in withdrawQuote() method, but we will have some unstaken tokens
        quoteLpBalance = quoteLpBalance * 1001 / 1000;

        // unstake lp tokens
        dodoMine.withdraw(address(usdtLPToken), quoteLpBalance);

        // remove liquidity from pool
        uint256 redeemedTokens = dodoV1UsdcUsdtPool.withdrawQuote(usdtTokenAmount);

        // swap usdt to usdc
        uint256 usdcTokenAmount = swap(balancerPoolId, IVault.SwapKind.GIVEN_IN, IAsset(address(usdtToken)),
            IAsset(address(usdcToken)), address(this), address(this), usdtToken.balanceOf(address(this)), 0);

        return usdcTokenAmount;
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        // unstake lp tokens
        dodoMine.withdrawAll(address(usdtLPToken));

        // remove liquidity from pool
        uint256 redeemedTokens = dodoV1UsdcUsdtPool.withdrawAllQuote();

        // swap usdt to usdc
        uint256 usdcTokenAmount = swap(balancerPoolId, IVault.SwapKind.GIVEN_IN, IAsset(address(usdtToken)),
            IAsset(address(usdcToken)), address(this), address(this), usdtToken.balanceOf(address(this)), 0);

        return usdcTokenAmount;
    }

    function netAssetValue() external override view returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external override view returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        uint256 quoteLpBalance = dodoMine.getUserLpBalance(address(usdtLPToken), address(this));
        if (quoteLpBalance == 0) {
            return 0;
        }

        uint256 quoteLpTotalSupply = usdtLPToken.totalSupply();
        (, uint256 quoteTarget) = dodoV1UsdcUsdtPool.getExpectedTarget();
        uint256 usdtTokenBalance = quoteLpBalance * quoteTarget / quoteLpTotalSupply;

        uint256 usdcTokenBalance = onSwap(balancerPoolId, IVault.SwapKind.GIVEN_IN, usdtToken, usdcToken, usdtTokenBalance);

        return usdcToken.balanceOf(address(this)) + usdcTokenBalance;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        dodoMine.claimAll();

        uint256 dodoBalance = dodoToken.balanceOf(address(this));
        if (dodoBalance == 0) {
            return 0;
        }

        // swap v2 dodo -> usdt
        uint256 usdtTokenAmount = _useDodoSwapV2(address(dodoV2DodoUsdtPool), address(dodoToken), address(usdtToken), dodoBalance, 1, 0);

        // swap v1 usdt -> usdc
        uint256 usdcTokenAmount = _useDodoSwapV1(address(dodoV1UsdcUsdtPool), address(usdtToken), address(usdcToken), usdtTokenAmount, 1, 1);

        usdcToken.transfer(_to, usdcToken.balanceOf(address(this)));

        return usdcTokenAmount;
    }

}
