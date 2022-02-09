// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./Strategy.sol";
import "../connectors/balancer/interfaces/IVault.sol";
import "../connectors/balancer/interfaces/IAsset.sol";
import "../connectors/BalancerExchange.sol";
import "../connectors/QuickswapExchange.sol";

import "hardhat/console.sol";

contract StrategyBalancer is Strategy, BalancerExchange, QuickswapExchange {

    IERC20 public usdcToken;
    IERC20 public bpspTUsdToken;
    IERC20 public balToken;
    IERC20 public wmaticToken;
    IERC20 public tusdToken;

    uint256 public usdcTokenDenominator;
    uint256 public bpspTUsdTokenDenominator;
    uint256 public balTokenDenominator;
    uint256 public wmaticTokenDenominator;
    uint256 public tusdTokenDenominator;

    IVault public balancerVault;

    bytes32 public balancerPoolId1;
    bytes32 public balancerPoolId2;


    // --- events

    event StrategyBalancerUpdatedTokens(address usdcToken, address bpspTUsdToken, address balToken, address wmaticToken,
        address tusdToken, uint256 usdcTokenDenominator, uint256 bpspTUsdTokenDenominator,uint256 balTokenDenominator,
        uint256 wmaticTokenDenominator, uint256 tusdTokenDenominator);

    event StrategyBalancerUpdatedParams(address balancerVault, address uniswapRouter, bytes32 balancerPoolId1, bytes32 balancerPoolId2);


    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setTokens(
        address _usdcToken,
        address _bpspTUsdToken,
        address _balToken,
        address _wmaticToken,
        address _tusdToken
    ) external onlyAdmin {

        require(_usdcToken != address(0), "Zero address not allowed");
        require(_bpspTUsdToken != address(0), "Zero address not allowed");
        require(_balToken != address(0), "Zero address not allowed");
        require(_wmaticToken != address(0), "Zero address not allowed");
        require(_tusdToken != address(0), "Zero address not allowed");

        usdcToken = IERC20(_usdcToken);
        bpspTUsdToken = IERC20(_bpspTUsdToken);
        balToken = IERC20(_balToken);
        wmaticToken = IERC20(_wmaticToken);
        tusdToken = IERC20(_tusdToken);

        usdcTokenDenominator = 10 ** IERC20Metadata(_usdcToken).decimals();
        bpspTUsdTokenDenominator = 10 ** IERC20Metadata(_bpspTUsdToken).decimals();
        balTokenDenominator = 10 ** IERC20Metadata(_balToken).decimals();
        wmaticTokenDenominator = 10 ** IERC20Metadata(_wmaticToken).decimals();
        tusdTokenDenominator = 10 ** IERC20Metadata(_tusdToken).decimals();

        emit StrategyBalancerUpdatedTokens(_usdcToken, _bpspTUsdToken, _balToken, _wmaticToken, _tusdToken,
            usdcTokenDenominator, bpspTUsdTokenDenominator, balTokenDenominator, wmaticTokenDenominator, tusdTokenDenominator);
    }

    function setParams(
        address _balancerVault,
        address _uniswapRouter,
        bytes32 _balancerPoolId1,
        bytes32 _balancerPoolId2
    ) external onlyAdmin {

        require(_balancerVault != address(0), "Zero address not allowed");
        require(_uniswapRouter != address(0), "Zero address not allowed");

        require(_balancerPoolId1 != "", "Empty pool id not allowed");
        require(_balancerPoolId2 != "", "Empty pool id not allowed");

        balancerVault = IVault(_balancerVault);
        setBalancerVault(_balancerVault);
        setUniswapRouter(_uniswapRouter);

        balancerPoolId1 = _balancerPoolId1;
        balancerPoolId2 = _balancerPoolId2;

        emit StrategyBalancerUpdatedParams(_balancerVault, _uniswapRouter, _balancerPoolId1, _balancerPoolId2);
    }


    // --- logic

    function stake(
        address _asset,
        uint256 _amount
    ) external override onlyPortfolioManager {

        require(_asset == address(usdcToken), "Stake only in usdc");

        usdcToken.approve(address(balancerVault), _amount);

        (IERC20[] memory tokens, uint256[] memory balances, uint256 lastChangeBlock) = balancerVault.getPoolTokens(balancerPoolId1);

        IAsset[] memory assets = new IAsset[](4);
        uint256[] memory maxAmountsIn = new uint256[](4);
        uint256[] memory amountsIn = new uint256[](4);
        for (uint256 i; i < tokens.length; i++) {
            assets[i] = IAsset(address(tokens[i]));
            if (tokens[i] == usdcToken) {
                maxAmountsIn[i] = _amount;
                amountsIn[i] = _amount;
            } else {
                maxAmountsIn[i] = 0;
                amountsIn[i] = 0;
            }
        }

        uint256 joinKind = 1;
        uint256 minimumBPT = 0;
        bytes memory userData = abi.encode(joinKind, amountsIn, minimumBPT);

        IVault.JoinPoolRequest memory request = IVault.JoinPoolRequest(assets, maxAmountsIn, userData, false);

        balancerVault.joinPool(balancerPoolId1, address(this), address(this), request);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Unstake only in usdc");

        (IERC20[] memory tokens, uint256[] memory balances, uint256 lastChangeBlock) = balancerVault.getPoolTokens(balancerPoolId1);

        IAsset[] memory assets = new IAsset[](4);
        uint256[] memory minAmountsOut = new uint256[](4);
        for (uint256 i; i < tokens.length; i++) {
            assets[i] = IAsset(address(tokens[i]));
            if (tokens[i] == usdcToken) {
                //TODO: Balancer. FIX if big slippage
                minAmountsOut[i] = _amount * 99 / 100;
            } else {
                minAmountsOut[i] = 0;
            }
        }

        uint256 exitKind = 0;
        uint256 exitTokenIndex = 0;
        // 18 = 18 + 6 - 6
        uint256 amountBpspTUsd = bpspTUsdTokenDenominator * _amount / _getBpspTUsdBuyPrice(bpspTUsdTokenDenominator);
        bytes memory userData = abi.encode(exitKind, amountBpspTUsd, exitTokenIndex);

        IVault.ExitPoolRequest memory request = IVault.ExitPoolRequest(assets, minAmountsOut, userData, false);

        balancerVault.exitPool(balancerPoolId1, address(this), payable(address(this)), request);
        return usdcToken.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        require(_asset == address(usdcToken), "Some token not compatible");
        uint256 _amount = bpspTUsdToken.balanceOf(address(this));

        return 0;
    }

    function netAssetValue() external override view returns (uint256) {
        uint256 balanceBpspTUsd = bpspTUsdToken.balanceOf(address(this));
        return _getBpspTUsdBuyPrice(balanceBpspTUsd);
    }

    function liquidationValue() external override view returns (uint256) {
        uint256 balanceBpspTUsd = bpspTUsdToken.balanceOf(address(this));
        return _getBpspTUsdSellPrice(balanceBpspTUsd);
    }

    function _getBpspTUsdBuyPrice(uint256 balanceBpspTUsd) internal view returns (uint256) {
        uint256 totalSupply = bpspTUsdToken.totalSupply();

        uint256 totalBalanceUsdc;
        (IERC20[] memory tokens, uint256[] memory balances, uint256 lastChangeBlock) = balancerVault.getPoolTokens(balancerPoolId1);
        for (uint256 i; i < tokens.length; i++) {
            uint256 tokenBalance = balances[i] * balanceBpspTUsd / totalSupply;
            if (tokens[i] != usdcToken) {
                totalBalanceUsdc += onSwap(balancerPoolId1, IVault.SwapKind.GIVEN_OUT, usdcToken, tokens[i], tokenBalance);
            } else {
                totalBalanceUsdc += tokenBalance;
            }
        }

        return totalBalanceUsdc;
    }

    function _getBpspTUsdSellPrice(uint256 balanceBpspTUsd) internal view returns (uint256) {
        uint256 totalSupply = bpspTUsdToken.totalSupply();

        uint256 totalBalanceUsdc;
        (IERC20[] memory tokens, uint256[] memory balances, uint256 lastChangeBlock) = balancerVault.getPoolTokens(balancerPoolId1);
        for (uint256 i; i < tokens.length; i++) {
            uint256 tokenBalance = balances[i] * balanceBpspTUsd / totalSupply;
            if (tokens[i] != usdcToken) {
                totalBalanceUsdc += onSwap(balancerPoolId1, IVault.SwapKind.GIVEN_IN, tokens[i], usdcToken, tokenBalance);
            } else {
                totalBalanceUsdc += tokenBalance;
            }
        }

        return totalBalanceUsdc;
    }

    function claimRewards(address _to) external override onlyPortfolioManager returns (uint256) {
        //TODO: Balancer. Claiming
//        claimRewards();

        uint256 totalUsdc;

        uint256 balBalance = balToken.balanceOf(address(this));
        if (balBalance != 0) {
            uint256 balUsdc = swap(balancerPoolId2, IVault.SwapKind.GIVEN_IN, IAsset(address(balToken)),
                IAsset(address(usdcToken)), address(this), address(_to), balBalance);
            totalUsdc += balUsdc;
        }

        uint256 wmaticBalance = wmaticToken.balanceOf(address(this));
        if (wmaticBalance != 0) {
            uint256 wmaticUsdc = swapTokenToUsdc(address(wmaticToken), address(usdcToken), wmaticTokenDenominator,
                address(this), address(_to), wmaticBalance);
            totalUsdc += wmaticUsdc;
        }

        uint256 tusdBalance = tusdToken.balanceOf(address(this));
        if (tusdBalance != 0) {
            uint256 tusdUsdc = swap(balancerPoolId1, IVault.SwapKind.GIVEN_IN, IAsset(address(tusdToken)),
                IAsset(address(usdcToken)), address(this), address(_to), tusdBalance);
            totalUsdc += tusdUsdc;
        }

        emit Reward(totalUsdc);
        return totalUsdc;
    }
}
