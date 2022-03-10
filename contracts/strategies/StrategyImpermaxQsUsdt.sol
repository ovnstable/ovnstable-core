// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./Strategy.sol";
import "../connectors/aave/interfaces/ILendingPoolAddressesProvider.sol";
import "../connectors/aave/interfaces/ILendingPool.sol";
import "../connectors/BalancerExchange.sol";
import "../connectors/impermax/ImpermaxRouter.sol";
import "../connectors/impermax/IPoolToken.sol";
import "../connectors/uniswap/interfaces/IUniswapV2Pair.sol";


contract StrategyImpermaxQsUsdt is Strategy, BalancerExchange {

    IERC20 public usdcToken;
    IERC20 public usdtToken;
    IPoolToken public imxBToken;

    bytes32 public balancerPoolId;

    ImpermaxRouter public impermaxRouter;
    IUniswapV2Pair public pair;

    uint public impermaxExchangeRate;

    // --- events

    event StrategyUpdatedTokens(address usdcToken, address aUsdcToken);

    event StrategyUpdatedParams(address aaveProvider);


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setTokens(
        address _usdcToken,
        address _usdtToken
    ) external onlyAdmin {

        require(_usdcToken != address(0), "Zero address not allowed");
        require(_usdtToken != address(0), "Zero address not allowed");

        usdcToken = IERC20(_usdcToken);
        usdtToken = IERC20(_usdtToken);
    }

    function setParams(
        address _impermaxRouter,
        address _balancerVault,
        bytes32 _balancerPoolId,
        address _imxBToken
    ) external onlyAdmin {

        require(_impermaxRouter != address(0), "Zero address not allowed");
        require(_balancerVault != address(0), "Zero address not allowed");
        require(_balancerPoolId != "", "Empty pool id not allowed");
        require(_imxBToken != address(0), "Zero address not allowed");

        impermaxRouter = ImpermaxRouter(_impermaxRouter);
        imxBToken = IPoolToken(_imxBToken);

        pair = IUniswapV2Pair(impermaxRouter.getUniswapV2Pair(imxBToken.underlying()));

        balancerPoolId = _balancerPoolId;
        setBalancerVault(_balancerVault);
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
        require(_asset == address(usdcToken), "Some token not compatible");

        address current = address(this);

        swap(balancerPoolId, IVault.SwapKind.GIVEN_IN, IAsset(address(usdcToken)), IAsset(address(usdtToken)), current, current, usdcToken.balanceOf(current), 0);

        usdtToken.approve(address(impermaxRouter), usdtToken.balanceOf(current));
        impermaxRouter.mint(address(imxBToken), usdtToken.balanceOf(current), current, block.timestamp);

        impermaxExchangeRate = imxBToken.exchangeRate();
    }


    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        require(_asset == address(usdcToken), "Some token not compatible");

        address current = address(this);

        imxBToken.approve(address(impermaxRouter), imxBToken.balanceOf(current));
        impermaxRouter.redeem(address(imxBToken), imxBToken.balanceOf(current), current, block.timestamp, "");

        swap(balancerPoolId, IVault.SwapKind.GIVEN_IN, IAsset(address(usdtToken)), IAsset(address(usdcToken)), current, current, _amount, 0);

        usdtToken.approve(address(impermaxRouter), usdtToken.balanceOf(current));
        impermaxRouter.mint(address(imxBToken), usdtToken.balanceOf(current), current, block.timestamp);


        return usdcToken.balanceOf(current);
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        require(_asset == address(usdcToken), "Some token not compatible");

        address current = address(this);

        imxBToken.approve(address(impermaxRouter), imxBToken.balanceOf(current));
        impermaxRouter.redeem(address(imxBToken), imxBToken.balanceOf(current), current, block.timestamp, "");

        swap(balancerPoolId, IVault.SwapKind.GIVEN_IN, IAsset(address(usdtToken)), IAsset(address(usdcToken)), current, current, usdtToken.balanceOf(current), 0);

        impermaxExchangeRate = imxBToken.exchangeRate();

        return usdcToken.balanceOf(current);
    }


    function netAssetValue() external view override returns (uint256) {
        return _getTotal();

    }

    function liquidationValue() external view override returns (uint256) {
        return _getTotal();
    }

    function _getTotal() internal view returns (uint256){
        uint256 balance = usdcToken.balanceOf(address(this));

        uint256 lockedBalance = imxBToken.balanceOf(address(this));

        if (lockedBalance != 0) {
            uint256 balanceUsdt = (lockedBalance * impermaxExchangeRate) / 1e18;
            balance += onSwap(balancerPoolId, IVault.SwapKind.GIVEN_OUT, usdcToken, usdtToken, balanceUsdt);
        }

        return balance;
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {
        impermaxExchangeRate = imxBToken.exchangeRate();
        return 0;
    }

}
