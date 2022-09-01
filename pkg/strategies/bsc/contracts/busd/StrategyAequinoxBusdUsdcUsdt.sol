// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Balancer.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";

import "hardhat/console.sol";

contract StrategyAequinoxBusdUsdcUsdt is Strategy {

    // --- structs

    struct StrategyParams {
        address busdToken;
        address usdcToken;
        address usdtToken;
        address wBnbToken;
        address aeqToken;
        address lpToken;
        address vault;
        address gauge;
        bytes32 poolIdBusdUsdcUsdt;
        bytes32 poolIdAeqWBnb;
        bytes32 poolIdWBnbBusd;
        address chainlinkBusd;
        address chainlinkUsdc;
        address chainlinkUsdt;
    }

    // --- params

    IERC20 public busdToken;
    IERC20 public usdcToken;
    IERC20 public usdtToken;
    IERC20 public wBnbToken;
    IERC20 public aeqToken;
    IERC20 public lpToken;

    IVault public vault;
    IGauge public gauge;

    bytes32 public poolIdBusdUsdcUsdt;
    bytes32 public poolIdAeqWBnb;
    bytes32 public poolIdWBnbBusd;

    IPriceFeed public chainlinkBusd;
    IPriceFeed public chainlinkUsdc;
    IPriceFeed public chainlinkUsdt;

    uint256 public busdTokenDenominator;
    uint256 public usdcTokenDenominator;
    uint256 public usdtTokenDenominator;
    uint256 public lpTokenDenominator;

    // --- events

    event StrategyUpdatedParams();

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }

    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {

        busdToken = IERC20(params.busdToken);
        usdcToken = IERC20(params.usdcToken);
        usdtToken = IERC20(params.usdtToken);
        wBnbToken = IERC20(params.wBnbToken);
        aeqToken = IERC20(params.aeqToken);
        lpToken = IERC20(params.lpToken);

        vault = IVault(params.vault);
        gauge = IGauge(params.gauge);

        poolIdBusdUsdcUsdt = params.poolIdBusdUsdcUsdt;
        poolIdAeqWBnb = params.poolIdAeqWBnb;
        poolIdWBnbBusd = params.poolIdWBnbBusd;

        chainlinkBusd = IPriceFeed(params.chainlinkBusd);
        chainlinkUsdc = IPriceFeed(params.chainlinkUsdc);
        chainlinkUsdt = IPriceFeed(params.chainlinkUsdt);

        busdTokenDenominator = 10 ** IERC20Metadata(params.busdToken).decimals();
        usdcTokenDenominator = 10 ** IERC20Metadata(params.usdcToken).decimals();
        usdtTokenDenominator = 10 ** IERC20Metadata(params.usdtToken).decimals();
        lpTokenDenominator = 10 ** IERC20Metadata(params.lpToken).decimals();

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(busdToken), "Some token not compatible");

        (IERC20[] memory tokens, uint256[] memory balances, uint256 lastChangeBlock) = vault.getPoolTokens(poolIdBusdUsdcUsdt);

        IAsset[] memory assets = new IAsset[](3);
        uint256[] memory maxAmountsIn = new uint256[](3);
        uint256[] memory amountsIn = new uint256[](3);
        for (uint256 i; i < 3; i++) {
            assets[i] = IAsset(address(tokens[i]));
            if (tokens[i] == busdToken) {
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

        // join pool
        busdToken.approve(address(vault), _amount);
        vault.joinPool(poolIdBusdUsdcUsdt, address(this), address(this), request);

        // stake lp
        uint256 lpBalance = lpToken.balanceOf(address(this));
        lpToken.approve(address(gauge), lpBalance);
        gauge.deposit(lpBalance);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(busdToken), "Some token not compatible");

        uint256 amountLp = (lpTokenDenominator * _amount * 10004) / (_getBusdByLp(lpTokenDenominator, false) * 10000);

        // unstake lp
        gauge.withdraw(amountLp);

        (IERC20[] memory tokens, uint256[] memory balances, uint256 lastChangeBlock) = vault.getPoolTokens(poolIdBusdUsdcUsdt);

        IAsset[] memory assets = new IAsset[](3);
        uint256[] memory minAmountsOut = new uint256[](3);
        for (uint256 i; i < 3; i++) {
            assets[i] = IAsset(address(tokens[i]));
            if (tokens[i] == busdToken) {
                minAmountsOut[i] = _amount;
            } else {
                minAmountsOut[i] = 0;
            }
        }

        uint256 exitKind = 0;
        uint256 exitTokenIndex = 2;
        bytes memory userData = abi.encode(exitKind, amountLp, exitTokenIndex);

        IVault.ExitPoolRequest memory request = IVault.ExitPoolRequest(assets, minAmountsOut, userData, false);

        // exit pool
        vault.exitPool(poolIdBusdUsdcUsdt, address(this), payable(address(this)), request);

        console.log("busdToken balance after unstake: %s", busdToken.balanceOf(address(this)));
        return busdToken.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(busdToken), "Some token not compatible");

        uint256 amountLp = gauge.balanceOf(address(this));
        uint256 amountBusd = _getBusdByLp(amountLp, false);

        // unstake lp
        gauge.withdraw(amountLp);

        (IERC20[] memory tokens, uint256[] memory balances, uint256 lastChangeBlock) = vault.getPoolTokens(poolIdBusdUsdcUsdt);

        IAsset[] memory assets = new IAsset[](3);
        uint256[] memory minAmountsOut = new uint256[](3);
        for (uint256 i; i < 3; i++) {
            assets[i] = IAsset(address(tokens[i]));
            if (tokens[i] == busdToken) {
                minAmountsOut[i] = amountBusd * 9996 / 10000;
            } else {
                minAmountsOut[i] = 0;
            }
        }

        uint256 exitKind = 0;
        uint256 exitTokenIndex = 2;
        bytes memory userData = abi.encode(exitKind, amountLp, exitTokenIndex);

        IVault.ExitPoolRequest memory request = IVault.ExitPoolRequest(assets, minAmountsOut, userData, false);

        // exit pool
        vault.exitPool(poolIdBusdUsdcUsdt, address(this), payable(address(this)), request);

        console.log("busdToken balance after unstakeFull: %s", busdToken.balanceOf(address(this)));
        return busdToken.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue(true);
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue(true);
    }

    function _totalValue(bool nav) internal view returns (uint256) {
        uint256 busdBalance = busdToken.balanceOf(address(this));

        uint256 lpBalance = IERC20(address(gauge)).balanceOf(address(this));
        console.log("lpBalance: %s", lpBalance);
        if (lpBalance > 0) {
            (address pool,) = vault.getPool(poolIdBusdUsdcUsdt);
            busdBalance += lpBalance * IBasePool(pool).getRate() / lpTokenDenominator;
//            busdBalance += _getBusdByLp(lpBalance, nav);
        }
        console.log("busdBalance: %s", busdBalance);

        return busdBalance;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        uint256 lpBalance = gauge.balanceOf(address(this));
        if (lpBalance > 0) {
            gauge.claim_rewards();
        }

        // sell rewards
        uint256 totalBusd;

        uint256 aeqBalance = aeqToken.balanceOf(address(this));
        if (aeqBalance > 0) {
            uint256 aeqBusd = BalancerLibrary.batchSwap(
                vault,
                IVault.SwapKind.GIVEN_IN,
                aeqToken,
                wBnbToken,
                busdToken,
                poolIdAeqWBnb,
                poolIdWBnbBusd,
                aeqBalance,
                address(this),
                address(this)
            );

            totalBusd += aeqBusd;
        }

        if (totalBusd > 0) {
            busdToken.transfer(_to, totalBusd);
        }

        return totalBusd;
    }

    function _getBusdByLp(uint256 lpBalance, bool nav) internal returns (uint256) {
        uint256 priceBusd = uint256(chainlinkBusd.latestAnswer());
        uint256 priceUsdc = uint256(chainlinkUsdc.latestAnswer());
        uint256 priceUsdt = uint256(chainlinkUsdt.latestAnswer());
        uint256 lpTotalSupply = lpToken.totalSupply();

        uint256 totalBalanceBusd;
        (IERC20[] memory tokens, uint256[] memory balances, uint256 lastChangeBlock) = vault.getPoolTokens(poolIdBusdUsdcUsdt);
        for (uint256 i; i < 3; i++) {
            uint256 tokenBalance = balances[i] * lpBalance / lpTotalSupply;
            if (tokens[i] == usdtToken) {
                if (nav) {
                    totalBalanceBusd += (tokenBalance * busdTokenDenominator * priceUsdt) / (usdtTokenDenominator * priceBusd);
                } else {
//                    totalBalanceBusd += BalancerLibrary.onSwap(
//                        vault,
//                        IVault.SwapKind.GIVEN_IN,
//                        tokens[i],
//                        busdToken,
//                        poolIdBusdUsdcUsdt,
//                        tokenBalance
//                    );
                    console.log("usdtToken tokenBalance: %s", tokenBalance);
                    int256[] memory assetDeltas = BalancerLibrary.queryBatchSwap(
                        vault,
                        IVault.SwapKind.GIVEN_IN,
                        tokens[i],
                        busdToken,
                        poolIdBusdUsdcUsdt,
                        tokenBalance
                    );
                    console.log("assetDeltas[0]: %s", uint256(assetDeltas[0]));
                    console.log("assetDeltas[1]: %s", uint256(-assetDeltas[1]));
                    totalBalanceBusd += uint256(-assetDeltas[1]);
                }
                console.log("usdtToken totalBalanceBusd: %s", totalBalanceBusd);
            } else if (tokens[i] == usdcToken) {
                if (nav) {
                    totalBalanceBusd += (tokenBalance * busdTokenDenominator * priceUsdc) / (usdcTokenDenominator * priceBusd);
                } else {
//                    totalBalanceBusd += BalancerLibrary.onSwap(
//                        vault,
//                        IVault.SwapKind.GIVEN_IN,
//                        tokens[i],
//                        busdToken,
//                        poolIdBusdUsdcUsdt,
//                        tokenBalance
//                    );
                    console.log("usdcToken tokenBalance: %s", tokenBalance);
                    int256[] memory assetDeltas = BalancerLibrary.queryBatchSwap(
                        vault,
                        IVault.SwapKind.GIVEN_IN,
                        tokens[i],
                        busdToken,
                        poolIdBusdUsdcUsdt,
                        tokenBalance
                    );
                    console.log("assetDeltas[0]: %s", uint256(assetDeltas[0]));
                    console.log("assetDeltas[1]: %s", uint256(-assetDeltas[1]));
                    totalBalanceBusd += uint256(-assetDeltas[1]);
                }
                console.log("usdcToken totalBalanceBusd: %s", totalBalanceBusd);
            } else if (tokens[i] == busdToken) {
                console.log("busdToken tokenBalance: %s", tokenBalance);
                totalBalanceBusd += tokenBalance;
                console.log("busdToken totalBalanceBusd: %s", totalBalanceBusd);
            }
        }

        return totalBalanceBusd;
    }

}
