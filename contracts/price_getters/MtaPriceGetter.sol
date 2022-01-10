// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../price_getters/AbstractPriceGetter.sol";
import "../connectors/balancer/interfaces/IVault.sol";
import "../connectors/balancer/interfaces/IAsset.sol";
import "../connectors/balancer/interfaces/IMinimalSwapInfoPool.sol";
import "../connectors/balancer/balances/MinimalSwapInfoPoolsBalance.sol";

import "hardhat/console.sol";

contract MtaPriceGetter is AbstractPriceGetter {

    IVault public balancerVault;
    IMinimalSwapInfoPool public balancerSwap;
    IERC20 public usdcToken;
    IERC20 public wmaticToken;
    IERC20 public mtaToken;
    bytes32 public constant poolId1 = bytes32(uint256(0x614b5038611729ed49e0ded154d8a5d3af9d1d9e00010000000000000000001d));
    bytes32 public constant poolId2 = bytes32(uint256(0x0297e37f1873d2dab4487aa67cd56b58e2f27875000100000000000000000002));

    constructor(
        address _balancerVault,
        address _usdcToken,
        address _wmaticToken,
        address _mtaToken
    ) {
        require(_balancerVault != address(0), "Zero address not allowed");
        require(_usdcToken != address(0), "Zero address not allowed");
        require(_wmaticToken != address(0), "Zero address not allowed");
        require(_mtaToken != address(0), "Zero address not allowed");

        balancerVault = IVault(_balancerVault);
        balancerSwap = IMinimalSwapInfoPool(_balancerVault);
        usdcToken = IERC20(_usdcToken);
        wmaticToken = IERC20(_wmaticToken);
        mtaToken = IERC20(_mtaToken);
    }

    function getUsdcBuyPrice() external view override returns (uint256) {
        return 0;
    }

    function getUsdcSellPrice() external view override returns (uint256) {
        return 0;
    }

    function getBalancerPrice(uint256 amount) external returns (uint256) {
        mtaToken.approve(address(balancerSwap), amount);

        (IERC20[] memory tokens, uint256[] memory balances, uint256 lastChangeBlock) = balancerVault.getPoolTokens(poolId1);
//        for (uint256 i = 0; i < tokens.length; i++) {
//            console.log("Token: %s", address(tokens[i]));
//            console.log("Balance: %s", balances[i]);
//        }
//
//        uint256 joinKindInit = 1;
//        uint256[] memory initBalances = new uint256[](3);
//        initBalances[0] = 0;
//        initBalances[1] = 0;
//        initBalances[2] = amount;
//        bytes memory userData = abi.encode(joinKindInit, initBalances);

        IPoolSwapStructs.SwapRequest memory swapRequest;
        swapRequest.kind = IVault.SwapKind.GIVEN_OUT;
        swapRequest.tokenIn = mtaToken;
        swapRequest.tokenOut = wmaticToken;
        swapRequest.amount = amount;
//        swapRequest.poolId = poolId1;
//        swapRequest.lastChangeBlock = lastChangeBlock;
//        swapRequest.from = address(this);
//        swapRequest.to = address(this);
//        swapRequest.userData = userData;

        uint256 balance = balancerSwap.onSwap(swapRequest, balances[2], balances[0]);
        console.log("Balance: %s", balance);
        return balance;
    }

    function swap(uint256 amount, address payable recipient) external returns (uint256) {
        mtaToken.approve(address(balancerVault), amount);

//        uint256 joinKindInit = 1;
//        uint256[] memory initBalances = new uint256[](3);
//        initBalances[0] = 0;
//        initBalances[1] = 0;
//        initBalances[2] = amount;
//        bytes memory userData = abi.encode(joinKindInit, initBalances);

        IVault.SingleSwap memory singleSwap;
        singleSwap.poolId = poolId1;
        singleSwap.kind = IVault.SwapKind.GIVEN_IN;
        singleSwap.assetIn = IAsset(address(mtaToken));
        singleSwap.assetOut = IAsset(address(wmaticToken));
        singleSwap.amount = amount;
//        singleSwap.userData = userData;

        IVault.FundManagement memory fundManagement;
        fundManagement.sender = address(this);
        fundManagement.fromInternalBalance = false;
        fundManagement.recipient = recipient;
        fundManagement.toInternalBalance = false;

        uint256 balance = balancerVault.swap(singleSwap, fundManagement, 1, 10000000000000);
        console.log("Balance: %s", balance);
        return balance;
    }

//    function batchSwap(uint256 amount, address payable recipient) external returns (uint256) {
//        mtaToken.approve(address(balancerVault), amount);
//
//        IVault.BatchSwapStep[] memory swaps;
//        IVault.BatchSwapStep memory batchSwap1;
//        batchSwap1.poolId = poolId1;
//        batchSwap1.assetInIndex = 2;
//        batchSwap1.assetOutIndex = 0;
//        batchSwap1.amount = amount;
//        swaps[0] = batchSwap1;
//        IVault.BatchSwapStep memory batchSwap2;
//        batchSwap2.poolId = poolId2;
//        batchSwap2.assetInIndex = 2;
//        batchSwap2.assetOutIndex = 0;
//        batchSwap2.amount = amount;
//        swaps[1] = batchSwap2;
//
//        IAsset[] memory assets;
//        assets[0] = IAsset(address(mtaToken));
//        assets[1] = IAsset(address(wmaticToken));
//        assets[2] = IAsset(address(usdcToken));
//
//        IVault.FundManagement memory fundManagement;
//        fundManagement.sender = address(this);
//        fundManagement.fromInternalBalance = false;
//        fundManagement.recipient = recipient;
//        fundManagement.toInternalBalance = false;
//
//        int256[] memory limits;
//        limits[0] = 1;
//        limits[1] = 1;
//        limits[2] = 1;
//
//        uint256 balance = balancerVault.batchSwap(IVault.SwapKind.GIVEN_IN, swaps, assets, limits, 10000000000000);
//        console.log("Balance: %s", balance);
//        return balance;
//    }
}
