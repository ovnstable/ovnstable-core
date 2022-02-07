// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "../interfaces/IStrategy.sol";
import "../connectors/balancer/interfaces/IVault.sol";
import "../connectors/balancer/interfaces/IAsset.sol";
import "../connectors/BalancerExchange.sol";
import "../connectors/QuickswapExchange.sol";

import "hardhat/console.sol";

contract StrategyBalancer is IStrategy, AccessControlUpgradeable, UUPSUpgradeable {

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    IVault public balancerVault;
    IERC20 public usdcToken;
    IERC20 public bpspTUsdToken;
    IERC20 public balToken;
    IERC20 public wmaticToken;
    IERC20 public tusdToken;
    BalancerExchange public balancerExchange;
    QuickswapExchange public quickswapExchange;
    bytes32 public balancerPoolId1;
    bytes32 public balancerPoolId2;
    uint256 public usdcTokenDenominator;
    uint256 public bpspTUsdTokenDenominator;
    uint256 public balTokenDenominator;
    uint256 public wmaticTokenDenominator;
    uint256 public tusdTokenDenominator;


    // --- events

    event StrategyBalancerUpdate(address balancerVault, address usdcToken, address bpspTUsdToken, address balToken,
        address wmaticToken, address tusdToken, address balancerExchange, address quickswapExchange,
        bytes32 balancerPoolId1, bytes32 balancerPoolId2, uint256 usdcTokenDenominator, uint256 bpspTUsdTokenDenominator,
        uint256 balTokenDenominator, uint256 wmaticTokenDenominator, uint256 tusdTokenDenominator);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }

    // ---  modifiers

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }


    // --- Setters

    function setParams(
        address _balancerVault,
        address _usdcToken,
        address _bpspTUsdToken,
        address _balToken,
        address _wmaticToken,
        address _tusdToken,
        address _balancerExchange,
        address _quickswapExchange,
        bytes32 _balancerPoolId1,
        bytes32 _balancerPoolId2
    ) external onlyAdmin {
        require(_balancerVault != address(0), "Zero address not allowed");
        require(_usdcToken != address(0), "Zero address not allowed");
        require(_bpspTUsdToken != address(0), "Zero address not allowed");
        require(_balToken != address(0), "Zero address not allowed");
        require(_wmaticToken != address(0), "Zero address not allowed");
        require(_tusdToken != address(0), "Zero address not allowed");
        require(_balancerExchange != address(0), "Zero address not allowed");
        require(_quickswapExchange != address(0), "Zero address not allowed");
        require(_balancerPoolId1 != "", "Empty pool id not allowed");
        require(_balancerPoolId2 != "", "Empty pool id not allowed");

        balancerVault = IVault(_balancerVault);
        usdcToken = IERC20(_usdcToken);
        bpspTUsdToken = IERC20(_bpspTUsdToken);
        balToken = IERC20(_balToken);
        wmaticToken = IERC20(_wmaticToken);
        tusdToken = IERC20(_tusdToken);
        balancerExchange = BalancerExchange(_balancerExchange);
        quickswapExchange = QuickswapExchange(_quickswapExchange);
        balancerPoolId1 = _balancerPoolId1;
        balancerPoolId2 = _balancerPoolId2;
        usdcTokenDenominator = 10 ** IERC20Metadata(address(_usdcToken)).decimals();
        bpspTUsdTokenDenominator = 10 ** IERC20Metadata(address(_bpspTUsdToken)).decimals();
        balTokenDenominator = 10 ** IERC20Metadata(address(_balToken)).decimals();
        wmaticTokenDenominator = 10 ** IERC20Metadata(address(_wmaticToken)).decimals();
        tusdTokenDenominator = 10 ** IERC20Metadata(address(_tusdToken)).decimals();

        emit StrategyBalancerUpdate(_balancerVault, _usdcToken, _bpspTUsdToken, _balToken, _wmaticToken, _tusdToken,
            _balancerExchange, _quickswapExchange, _balancerPoolId1, _balancerPoolId2, usdcTokenDenominator,
            bpspTUsdTokenDenominator, balTokenDenominator, wmaticTokenDenominator, tusdTokenDenominator);
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(UPGRADER_ROLE)
    override
    {}


    // --- logic

    function stake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) public override {

        require(_asset == address(usdcToken), "Stake only in usdc");

        usdcToken.transferFrom(_beneficiary, address(this), _amount);

        IERC20(_asset).approve(address(balancerVault), _amount);

        (IERC20[] memory tokens, uint256[] memory balances, uint256 lastChangeBlock) = balancerVault.getPoolTokens(balancerPoolId1);

        IAsset[] memory assets = new IAsset[](4);
        uint256[] memory maxAmountsIn = new uint256[](4);
        uint256[] memory amountsIn = new uint256[](4);
        for (uint256 i; i < tokens.length; i++) {
            assets[i] = IAsset(address(tokens[i]));
            if (address(tokens[i]) == _asset) {
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

        balancerVault.joinPool(balancerPoolId1, address(this), _beneficiary, request);
    }

    function unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) public override returns (uint256) {

        require(_asset == address(usdcToken), "Stake only in usdc");

        usdcToken.transferFrom(_beneficiary, address(this), _amount);

        (IERC20[] memory tokens, uint256[] memory balances, uint256 lastChangeBlock) = balancerVault.getPoolTokens(balancerPoolId1);

        IAsset[] memory assets = new IAsset[](4);
        uint256[] memory minAmountsOut = new uint256[](4);
        for (uint256 i; i < tokens.length; i++) {
            assets[i] = IAsset(address(tokens[i]));
            if (address(tokens[i]) == _asset) {
                //TODO: Balancer. FIX if big slippage
                minAmountsOut[i] = _amount;
            } else {
                minAmountsOut[i] = 0;
            }
        }

        uint256 exitKind = 0;
        uint256 exitTokenIndex = 0;
        bytes memory userData = abi.encode(exitKind, _amount, exitTokenIndex);

        IVault.ExitPoolRequest memory request = IVault.ExitPoolRequest(assets, minAmountsOut, userData, false);

        balancerVault.exitPool(balancerPoolId1, address(this), payable(_beneficiary), request);
        return IERC20(_asset).balanceOf(_beneficiary);
    }

    function netAssetValue(address _holder) external override view returns (uint256) {
        uint256 balance = bpspTUsdToken.balanceOf(_holder);

        uint256 totalBalanceUsdc;
        (IERC20[] memory tokens, uint256[] memory balances, uint256 lastChangeBlock) = balancerVault.getPoolTokens(balancerPoolId1);
        for (uint256 i; i < tokens.length; i++) {
            if (tokens[i] != usdcToken) {
                totalBalanceUsdc += balancerExchange.onSwap(balancerPoolId1, IVault.SwapKind.GIVEN_OUT, usdcToken, tokens[i], balances[i]);
            } else {
                totalBalanceUsdc += balances[i];
            }
        }

        (address balancerPool, IVault.PoolSpecialization poolSpecialization) = balancerVault.getPool(balancerPoolId1);
        uint256 totalSupply = IERC20(address(balancerPool)).totalSupply();

        // 18 + 6 - 18 = 6
        return bpspTUsdTokenDenominator * totalBalanceUsdc / totalSupply;
    }

    function liquidationValue(address _holder) external override view returns (uint256) {
        uint256 balance = bpspTUsdToken.balanceOf(_holder);

        uint256 totalBalanceUsdc;
        (IERC20[] memory tokens, uint256[] memory balances, uint256 lastChangeBlock) = balancerVault.getPoolTokens(balancerPoolId1);
        for (uint256 i; i < tokens.length; i++) {
            if (tokens[i] != usdcToken) {
                totalBalanceUsdc += balancerExchange.onSwap(balancerPoolId1, IVault.SwapKind.GIVEN_IN, tokens[i], usdcToken, balances[i]);
            } else {
                totalBalanceUsdc += balances[i];
            }
        }

        (address balancerPool, IVault.PoolSpecialization poolSpecialization) = balancerVault.getPool(balancerPoolId1);
        uint256 totalSupply = IERC20(address(balancerPool)).totalSupply();

        // 18 + 6 - 18 = 6
        return bpspTUsdTokenDenominator * totalBalanceUsdc / totalSupply;
    }

    function claimRewards(address _beneficiary) external override returns (uint256) {
        //TODO: Balancer. Claiming
//        claimRewards();

        uint256 totalUsdc;

        uint256 balBalance = balToken.balanceOf(address(_beneficiary));
        if (balBalance != 0) {
            uint256 balUsdc = balancerExchange.swap(balancerPoolId2, IVault.SwapKind.GIVEN_IN, IAsset(address(balToken)),
                IAsset(address(usdcToken)), address(_beneficiary), address(_beneficiary), balToken.balanceOf(address(_beneficiary)));
            totalUsdc += balUsdc;
        }

        uint256 wmaticBalance = wMatic.balanceOf(address(_beneficiary));
        if (wmaticBalance != 0) {
            uint256 wmaticUsdc = quickswapExchange.swapTokenToUsdc(address(wmaticToken), address(usdcToken), wmaticTokenDenominator,
                address(_beneficiary), address(_beneficiary), wMatic.balanceOf(address(_beneficiary)));
            totalUsdc += wmaticUsdc;
        }

        uint256 tusdBalance = tusdToken.balanceOf(address(_beneficiary));
        if (tusdBalance != 0) {
            uint256 tusdUsdc = balancerExchange.swap(balancerPoolId1, IVault.SwapKind.GIVEN_IN, IAsset(address(tusdToken)),
                IAsset(address(usdcToken)), address(_beneficiary), address(_beneficiary), tusdToken.balanceOf(address(_beneficiary)));
            totalUsdc += tusdUsdc;
        }

        return totalUsdc;
    }
}
