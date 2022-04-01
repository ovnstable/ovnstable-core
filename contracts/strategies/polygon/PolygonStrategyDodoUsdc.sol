// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "../Strategy.sol";
import "../../exchanges/polygon/DodoExchange.sol";
import "../../connectors/dodo/IDODOV1.sol";
import "../../connectors/dodo/IDODOMine.sol";

contract PolygonStrategyDodoUsdc is Strategy, DodoExchange {

    IERC20 public usdcToken;
    IERC20 public usdtToken;
    IERC20 public dodoToken;
    IERC20 public usdcLPToken;
    IERC20 public usdtLPToken;

    IDODOV1 public dodoV1UsdcUsdtPool;
    IDODOV2 public dodoV2DodoUsdtPool;
    IDODOMine public dodoMine;


    // --- events

    event StrategyDodoUpdatedTokens(address usdcToken, address usdtToken, address dodoToken, address usdcLPToken,
        address usdtLPToken);

    event StrategyDodoUpdatedParams(address dodoV1UsdcUsdtPool, address dodoV2DodoUsdtPool, address dodoMine,
        address dodoV1Helper, address dodoProxy, address dodoApprove);


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
        address _dodoApprove
    ) external onlyAdmin {

        require(_dodoV1UsdcUsdtPool != address(0), "Zero address not allowed");
        require(_dodoV2DodoUsdtPool != address(0), "Zero address not allowed");
        require(_dodoMine != address(0), "Zero address not allowed");
        require(_dodoV1Helper != address(0), "Zero address not allowed");
        require(_dodoProxy != address(0), "Zero address not allowed");
        require(_dodoApprove != address(0), "Zero address not allowed");

        dodoV1UsdcUsdtPool = IDODOV1(_dodoV1UsdcUsdtPool);
        dodoV2DodoUsdtPool = IDODOV2(_dodoV2DodoUsdtPool);
        dodoMine = IDODOMine(_dodoMine);

        setDodoParams(_dodoV1Helper, _dodoProxy, _dodoApprove);

        emit StrategyDodoUpdatedParams(_dodoV1UsdcUsdtPool, _dodoV2DodoUsdtPool, _dodoMine, _dodoV1Helper, _dodoProxy, _dodoApprove);
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(usdcToken), "Some token not compatible");

        // add liquidity to pool
        usdcToken.approve(address(dodoV1UsdcUsdtPool), _amount);
        dodoV1UsdcUsdtPool.depositBaseTo(address(this), _amount);

        // stake all lp tokens, because we unstake 0.1% tokens and don't stake them in _unstake() method
        uint256 usdcLPTokenBalance = usdcLPToken.balanceOf(address(this));
        usdcLPToken.approve(address(dodoMine), usdcLPTokenBalance);
        dodoMine.deposit(address(usdcLPToken), usdcLPTokenBalance);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        // get lp tokens
        uint256 baseLpTotalSupply = usdcLPToken.totalSupply();
        (uint256 baseTarget,) = dodoV1UsdcUsdtPool.getExpectedTarget();
        uint256 baseLpBalance = _amount * baseLpTotalSupply / baseTarget;
        // need for smooth withdraw in withdrawBase() method, but we will have some unstaken tokens
        baseLpBalance = baseLpBalance * 1001 / 1000;

        // unstake lp tokens
        dodoMine.withdraw(address(usdcLPToken), baseLpBalance);

        // remove liquidity from pool
        uint256 redeemedTokens = dodoV1UsdcUsdtPool.withdrawBase(_amount);

        return redeemedTokens;
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        // unstake lp tokens
        dodoMine.withdrawAll(address(usdcLPToken));

        // remove liquidity from pool
        uint256 redeemedTokens = dodoV1UsdcUsdtPool.withdrawAllBase();

        return redeemedTokens;
    }

    function netAssetValue() external override view returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external override view returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        uint256 baseLpBalance = dodoMine.getUserLpBalance(address(usdcLPToken), address(this));
        if (baseLpBalance == 0) {
            return 0;
        }

        uint256 baseLpTotalSupply = usdcLPToken.totalSupply();
        (uint256 baseTarget,) = dodoV1UsdcUsdtPool.getExpectedTarget();
        uint256 amount = baseLpBalance * baseTarget / baseLpTotalSupply;

        return usdcToken.balanceOf(address(this)) + amount;
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
