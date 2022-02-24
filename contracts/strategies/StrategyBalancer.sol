// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./Strategy.sol";
import "../connectors/balancer/interfaces/IVault.sol";
import "../connectors/balancer/interfaces/IAsset.sol";
import "../connectors/BalancerExchange.sol";
import "../connectors/QuickswapExchange.sol";
import "../connectors/balancer/MerkleOrchard.sol";

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

    MerkleOrchard public merkleOrchard;

    address public distributorBal;
    address public distributorWMatic;
    address public distributorTUsd;

    uint256 public distributionId;


    // --- events

    event StrategyBalancerUpdatedTokens(address usdcToken, address bpspTUsdToken, address balToken, address wmaticToken,
        address tusdToken, uint256 usdcTokenDenominator, uint256 bpspTUsdTokenDenominator,uint256 balTokenDenominator,
        uint256 wmaticTokenDenominator, uint256 tusdTokenDenominator);

    event StrategyBalancerUpdatedParams(address balancerVault, address uniswapRouter, bytes32 balancerPoolId1, bytes32 balancerPoolId2,
        address merkleOrchard, address distributorBal, address distributorWMatic, address distributorTUsd, uint256 distributionId);


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
        bytes32 _balancerPoolId2,
        address _merkleOrchard,
        address _distributorBal,
        address _distributorWMatic,
        address _distributorTUsd,
        uint256 _distributionId
    ) external onlyAdmin {

        require(_balancerVault != address(0), "Zero address not allowed");
        require(_uniswapRouter != address(0), "Zero address not allowed");
        require(_balancerPoolId1 != "", "Empty pool id not allowed");
        require(_balancerPoolId2 != "", "Empty pool id not allowed");
        require(_merkleOrchard != address(0), "Zero address not allowed");
        require(_distributorBal != address(0), "Zero address not allowed");
        require(_distributorWMatic != address(0), "Zero address not allowed");
        require(_distributorTUsd != address(0), "Zero address not allowed");
        require(_distributionId != 0, "Zero distributionId not allowed");

        setBalancerVault(_balancerVault);
        setUniswapRouter(_uniswapRouter);

        balancerVault = IVault(_balancerVault);
        balancerPoolId1 = _balancerPoolId1;
        balancerPoolId2 = _balancerPoolId2;
        merkleOrchard = MerkleOrchard(_merkleOrchard);
        distributorBal = _distributorBal;
        distributorWMatic = _distributorWMatic;
        distributorTUsd = _distributorTUsd;
        distributionId = _distributionId;

        emit StrategyBalancerUpdatedParams(_balancerVault, _uniswapRouter, _balancerPoolId1, _balancerPoolId2,
            _merkleOrchard, _distributorBal, _distributorWMatic, _distributorTUsd, _distributionId);
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(usdcToken), "Some token not compatible");

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

        require(_asset == address(usdcToken), "Some token not compatible");

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
        uint256 amountBpspTUsd = bpspTUsdTokenDenominator * _amount / _getBpspTUsdSellPrice(bpspTUsdTokenDenominator);
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
        // 18 = 18
        uint256 amountBpspTUsd = _getBpspTUsdSellPrice(_amount);

        (IERC20[] memory tokens, uint256[] memory balances, uint256 lastChangeBlock) = balancerVault.getPoolTokens(balancerPoolId1);

        IAsset[] memory assets = new IAsset[](4);
        uint256[] memory minAmountsOut = new uint256[](4);
        for (uint256 i; i < tokens.length; i++) {
            assets[i] = IAsset(address(tokens[i]));
            if (tokens[i] == usdcToken) {
                //TODO: Balancer. FIX if big slippage
                minAmountsOut[i] = amountBpspTUsd * 99 / 100;
            } else {
                minAmountsOut[i] = 0;
            }
        }

        uint256 exitKind = 0;
        uint256 exitTokenIndex = 0;
        bytes memory userData = abi.encode(exitKind, _amount, exitTokenIndex);

        IVault.ExitPoolRequest memory request = IVault.ExitPoolRequest(assets, minAmountsOut, userData, false);

        balancerVault.exitPool(balancerPoolId1, address(this), payable(address(this)), request);
        return usdcToken.balanceOf(address(this));
    }

    function netAssetValue() external override view returns (uint256) {
        uint256 balance = bpspTUsdToken.balanceOf(address(this));
        if (balance == 0) {
            return 0;
        }
        return _getBpspTUsdBuyPrice(balance);
    }

    function liquidationValue() external override view returns (uint256) {
        uint256 balance = bpspTUsdToken.balanceOf(address(this));
        if (balance == 0) {
            return 0;
        }
        return _getBpspTUsdSellPrice(balance);
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

    function _claimRewards(address _to) internal override returns (uint256) {
        //TODO: Balancer. Claiming
//        claimRewards();

        uint256 totalUsdc;

        uint256 balBalance = balToken.balanceOf(address(this));
        if (balBalance != 0) {
            uint256 balUsdc = swap(balancerPoolId2, IVault.SwapKind.GIVEN_IN, IAsset(address(balToken)),
                IAsset(address(usdcToken)), address(this), address(this), balBalance);
            totalUsdc += balUsdc;
        }

        uint256 wmaticBalance = wmaticToken.balanceOf(address(this));
        if (wmaticBalance != 0) {
            uint256 wmaticUsdc = swapTokenToUsdc(address(wmaticToken), address(usdcToken), wmaticTokenDenominator,
                address(this), address(this), wmaticBalance);
            totalUsdc += wmaticUsdc;
        }

        uint256 tusdBalance = tusdToken.balanceOf(address(this));
        if (tusdBalance != 0) {
            uint256 tusdUsdc = swap(balancerPoolId1, IVault.SwapKind.GIVEN_IN, IAsset(address(tusdToken)),
                IAsset(address(usdcToken)), address(this), address(this), tusdBalance);
            totalUsdc += tusdUsdc;
        }

        usdcToken.transfer(_to, usdcToken.balanceOf(address(this)));
        return totalUsdc;
    }

    function claimRewards(
        uint256 claimedBalanceBal,
        uint256 claimedBalanceWMatic,
        uint256 claimedBalanceTUsd,
        bytes32[] memory merkleProofBal,
        bytes32[] memory merkleProofWMatic,
        bytes32[] memory merkleProofTUsd
    ) public {
        console.log("Start claim");

        uint8 size;
        if (claimedBalanceBal > 0) {
            size++;
        }
        if (claimedBalanceWMatic > 0) {
            size++;
        }
        if (claimedBalanceTUsd > 0) {
            size++;
        }
        MerkleOrchard.Claim[] memory claims = new MerkleOrchard.Claim[](size);
        IERC20[] memory tokens = new IERC20[](size);

        uint8 i;
        if (claimedBalanceBal > 0) {
            MerkleOrchard.Claim memory claimBal = MerkleOrchard.Claim(
                distributionId,
                claimedBalanceBal,
                distributorBal,
                i,
                merkleProofBal);
            claims[i] = claimBal;
            tokens[i] = balToken;
            i++;
            console.log("claimBal: %s", i);
        }
        if (claimedBalanceWMatic > 0) {
            MerkleOrchard.Claim memory claimWMatic = MerkleOrchard.Claim(
                distributionId,
                claimedBalanceWMatic,
                distributorWMatic,
                i,
                merkleProofWMatic);
            claims[i] = claimWMatic;
            tokens[i] = wmaticToken;
            i++;
            console.log("claimWMatic: %s", i);
        }
        if (claimedBalanceTUsd > 0) {
            MerkleOrchard.Claim memory claimTUsd = MerkleOrchard.Claim(
                distributionId,
                claimedBalanceTUsd,
                distributorTUsd,
                i,
                merkleProofTUsd);
            claims[i] = claimTUsd;
            tokens[i] = tusdToken;
            console.log("claimTUsd: %s", i);
        }

        merkleOrchard.claimDistributions(address(this), claims, tokens);

        uint256 balanceBal = balToken.balanceOf(address(this));
        console.log("balanceBal: %s", balanceBal);
        uint256 balanceWMatic = wmaticToken.balanceOf(address(this));
        console.log("balanceWMatic: %s", balanceWMatic);
        uint256 balanceTUsd = tusdToken.balanceOf(address(this));
        console.log("balanceTUsd: %s", balanceTUsd);

        console.log("Finish claim");
    }

    function verifyClaim(
        uint256 claimedBalanceBal,
        uint256 claimedBalanceWMatic,
        uint256 claimedBalanceTUsd,
        bytes32[] memory merkleProofBal,
        bytes32[] memory merkleProofWMatic,
        bytes32[] memory merkleProofTUsd
    ) public {
        console.log("Start verify claim");

        if (claimedBalanceBal > 0) {
            bool isClaimBal = merkleOrchard.verifyClaim(
                balToken,
                distributorBal,
                distributionId,
                address(this),
                claimedBalanceBal,
                merkleProofBal);
            console.log("isClaimBal: %s", isClaimBal);
        }

        if (claimedBalanceBal > 0) {
            bool isClaimWMatic = merkleOrchard.verifyClaim(
                balToken,
                distributorWMatic,
                distributionId,
                address(this),
                claimedBalanceWMatic,
                merkleProofWMatic);
            console.log("isClaimWMatic: %s", isClaimWMatic);
        }

        if (claimedBalanceBal > 0) {
            bool isClaimTUsd = merkleOrchard.verifyClaim(
                balToken,
                distributorTUsd,
                distributionId,
                address(this),
                claimedBalanceTUsd,
                merkleProofTUsd);
            console.log("isClaimTUsd: %s", isClaimTUsd);
        }

        console.log("Finish verify claim");
    }
}
