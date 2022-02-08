// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "../connectors/BalancerExchange.sol";
import "../connectors/QuickswapExchange.sol";
import "../connectors/mstable/interfaces/IMasset.sol";
import "../connectors/mstable/interfaces/ISavingsContract.sol";
import "../connectors/mstable/interfaces/IBoostedVaultWithLockup.sol";
import "./Strategy.sol";

import "hardhat/console.sol";

contract StrategyMStable is Strategy, BalancerExchange, QuickswapExchange {

    IERC20 public usdcToken;
    IMasset public mUsdToken;
    ISavingsContractV2 public imUsdToken;
    IBoostedVaultWithLockup public vimUsdToken;
    IERC20 public mtaToken;
    IERC20 public wmaticToken;

    uint256 public usdcTokenDenominator;
    uint256 public vimUsdTokenDenominator;
    uint256 public mtaTokenDenominator;
    uint256 public wmaticTokenDenominator;

    bytes32 public balancerPoolId1;
    bytes32 public balancerPoolId2;


    // --- events

    event StrategyMStableUpdatedTokens(address usdcToken, address mUsdToken, address imUsdToken, address vimUsdToken, address mtaToken, address wmaticToken,
        uint256 usdcTokenDenominator, uint256 vimUsdTokenDenominator, uint256 mtaTokenDenominator, uint256 wmaticTokenDenominator);

    event StrategyMStableUpdatedParams(address balancerVault, address uniswapRouter, bytes32 balancerPoolId1, bytes32 balancerPoolId2);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setTokens(
        address _usdcToken,
        address _mUsdToken,
        address _imUsdToken,
        address _vimUsdToken,
        address _mtaToken,
        address _wmaticToken
    ) external onlyAdmin {
        require(_usdcToken != address(0), "Zero address not allowed");
        require(_mUsdToken != address(0), "Zero address not allowed");
        require(_imUsdToken != address(0), "Zero address not allowed");
        require(_vimUsdToken != address(0), "Zero address not allowed");
        require(_mtaToken != address(0), "Zero address not allowed");
        require(_wmaticToken != address(0), "Zero address not allowed");

        usdcToken = IERC20(_usdcToken);
        mUsdToken = IMasset(_mUsdToken);
        imUsdToken = ISavingsContractV2(_imUsdToken);
        vimUsdToken = IBoostedVaultWithLockup(_vimUsdToken);
        mtaToken = IERC20(_mtaToken);
        wmaticToken = IERC20(_wmaticToken);

        usdcTokenDenominator = 10 ** IERC20Metadata(_usdcToken).decimals();
        vimUsdTokenDenominator = 10 ** IERC20Metadata(_vimUsdToken).decimals();
        mtaTokenDenominator = 10 ** IERC20Metadata(_mtaToken).decimals();
        wmaticTokenDenominator = 10 ** IERC20Metadata(_wmaticToken).decimals();

        emit StrategyMStableUpdatedTokens(_usdcToken, _mUsdToken, _imUsdToken, _vimUsdToken, _mtaToken, _wmaticToken,
            usdcTokenDenominator, vimUsdTokenDenominator, mtaTokenDenominator, wmaticTokenDenominator);
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

        setBalancerVault(_balancerVault);
        setUniswapRouter(_uniswapRouter);

        balancerPoolId1 = _balancerPoolId1;
        balancerPoolId2 = _balancerPoolId2;

        emit StrategyMStableUpdatedParams(_balancerVault, _uniswapRouter, _balancerPoolId1, _balancerPoolId2);
    }


    // --- logic

    function stake(
        address _asset,
        uint256 _amount
    ) public override {
        require(_asset == address(usdcToken), "Unstake only in usdc");

        usdcToken.approve(address(mUsdToken), _amount);

        uint256 mintedTokens = mUsdToken.mint(address(usdcToken), _amount, 0, address(this));

        mUsdToken.approve(address(imUsdToken), mintedTokens);
        uint256 savedTokens = imUsdToken.depositSavings(mintedTokens, address(this));

        imUsdToken.approve(address(vimUsdToken), savedTokens);
        vimUsdToken.stake(address(this), savedTokens);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        require(_asset == address(usdcToken), "Unstake only in usdc");

        // 18 = 18 + 6 - 6
        uint256 tokenAmount = vimUsdTokenDenominator * _amount / _getVimUsdBuyPrice();

        vimUsdToken.withdraw(tokenAmount);

        imUsdToken.redeem(imUsdToken.balanceOf(address(this)));

        mUsdToken.redeem(address(usdcToken), mUsdToken.balanceOf(address(this)), 0, address(this));

        uint256 redeemedTokens = usdcToken.balanceOf(address(this));
        usdcToken.transfer(_beneficiary, redeemedTokens);

        return redeemedTokens;
    }

    function netAssetValue() external override view returns (uint256) {
        uint256 balance = vimUsdToken.balanceOf(address(this));
        uint256 price = _getVimUsdBuyPrice();
        // 18 + 6 - 18 = 6
        return balance * price / vimUsdTokenDenominator;
    }

    function liquidationValue() external override view returns (uint256) {
        uint256 balance = vimUsdToken.balanceOf(address(this));
        uint256 price = _getVimUsdSellPrice();
        // 18 + 6 - 18 = 6
        return balance * price / vimUsdTokenDenominator;
    }

    function _getVimUsdBuyPrice() internal view returns (uint256) {
        uint256 mintOutput = mUsdToken.getMintOutput(address(usdcToken), usdcTokenDenominator);
        // 6 + 18 - 18 = 6
        return usdcTokenDenominator * vimUsdTokenDenominator / imUsdToken.underlyingToCredits(mintOutput);
    }

    function _getVimUsdSellPrice() internal view returns (uint256) {
        uint256 underlying = imUsdToken.creditsToUnderlying(vimUsdTokenDenominator);
        // 6 = 6
        return mUsdToken.getRedeemOutput(address(usdcToken), underlying);
    }

    function claimRewards(address _to) external override returns (uint256) {
        vimUsdToken.claimReward();

        uint256 totalUsdc;

        uint256 mtaBalance = mtaToken.balanceOf(address(this));
        if (mtaBalance != 0) {
            uint256 mtaUsdc = batchSwap(balancerPoolId1, balancerPoolId2, IVault.SwapKind.GIVEN_IN, IAsset(address(mtaToken)),
                IAsset(address(wmaticToken)), IAsset(address(usdcToken)), address(this), payable(_to), mtaBalance);
            totalUsdc += mtaUsdc;
        }

        uint256 wmaticBalance = wmaticToken.balanceOf(address(this));
        if (wmaticBalance != 0) {
            uint256 wmaticUsdc = swapTokenToUsdc(address(wmaticToken), address(usdcToken), wmaticTokenDenominator,
                address(this), address(_to), wmaticBalance);
            totalUsdc += wmaticUsdc;
        }

        emit Reward(totalUsdc);
        return totalUsdc;
    }
}
