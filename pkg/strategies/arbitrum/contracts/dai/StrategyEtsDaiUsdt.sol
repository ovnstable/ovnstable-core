// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/core/contracts/interfaces/IHedgeExchanger.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/Gmx.sol";
import "@overnight-contracts/connectors/contracts/stuff/Wombat.sol";


contract StrategyEtsDaiUsdt is Strategy {

    // --- params

    IERC20 public dai;
    IERC20 public usdt;

    uint256 public daiDm;
    uint256 public usdtDm;

    IERC20 public rebaseToken;
    IHedgeExchanger public hedgeExchanger;

    IPriceFeed public oracleDai;
    IPriceFeed public oracleUsdt;

    IRouter public gmxRouter;
    IVault public gmxVault;
    GmxReader public gmxReader;

    IWombatRouter public wombatRouter;
    address public wombatBasePool;


    // --- events

    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address dai;
        address usdt;
        address rebaseToken;
        address hedgeExchanger;
        address oracleDai;
        address oracleUsdt;
        address gmxRouter;
        address gmxVault;
        address gmxReader;
        address wombatRouter;
        address wombatBasePool;
    }


    // --- constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        dai = IERC20(params.dai);
        usdt = IERC20(params.usdt);

        daiDm = 10 ** IERC20Metadata(params.dai).decimals();
        usdtDm = 10 ** IERC20Metadata(params.usdt).decimals();

        rebaseToken = IERC20(params.rebaseToken);
        hedgeExchanger = IHedgeExchanger(params.hedgeExchanger);

        oracleDai = IPriceFeed(params.oracleDai);
        oracleUsdt = IPriceFeed(params.oracleUsdt);

        gmxRouter = IRouter(params.gmxRouter);
        gmxVault = IVault(params.gmxVault);
        gmxReader = GmxReader(params.gmxReader);

        wombatRouter = IWombatRouter(params.wombatRouter);
        wombatBasePool = params.wombatBasePool;

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        // swap dai to usdt
        uint256 usdtMinAmount = OvnMath.subBasisPoints(_oracleDaiToUsdt(_amount), swapSlippageBP) - 10;
        _swap(address(dai), address(usdt), _amount, usdtMinAmount);

        // buy
        uint256 usdtBalance = usdt.balanceOf(address(this));
        usdt.approve(address(hedgeExchanger), usdtBalance);
        hedgeExchanger.buy(usdtBalance, "");
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        // add for unstake more than requested
        uint256 rebaseTokenAmount = OvnMath.addBasisPoints(_oracleDaiToUsdt(_amount), swapSlippageBP) + 10;
        uint256 rebaseTokenBalance = rebaseToken.balanceOf(address(this));
        if (rebaseTokenAmount > rebaseTokenBalance) {
            rebaseTokenAmount = rebaseTokenBalance;
        }

        // redeem
        rebaseToken.approve(address(hedgeExchanger), rebaseTokenAmount);
        hedgeExchanger.redeem(rebaseTokenAmount);

        // swap usdt to dai
        uint256 usdtBalance = usdt.balanceOf(address(this));
        uint256 daiMinAmount = OvnMath.subBasisPoints(_oracleUsdtToDai(usdtBalance), swapSlippageBP);
        _swap(address(usdt), address(dai), usdtBalance, daiMinAmount);

        return dai.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        // redeem
        uint256 rebaseTokenBalance = rebaseToken.balanceOf(address(this));
        rebaseToken.approve(address(hedgeExchanger), rebaseTokenBalance);
        hedgeExchanger.redeem(rebaseTokenBalance);

        // swap usdt to dai
        uint256 usdtBalance = usdt.balanceOf(address(this));
        uint256 daiMinAmount = OvnMath.subBasisPoints(_oracleUsdtToDai(usdtBalance), swapSlippageBP);
        _swap(address(usdt), address(dai), usdtBalance, daiMinAmount);

        return dai.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue(true);
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue(false);
    }

    function _totalValue(bool nav) internal view returns (uint256) {
        uint256 daiBalance = dai.balanceOf(address(this));
        uint256 usdtBalance = usdt.balanceOf(address(this)) + rebaseToken.balanceOf(address(this));

        if (usdtBalance > 0) {
            if (nav) {
                daiBalance += _oracleUsdtToDai(usdtBalance);
            } else {
                daiBalance += GmxLibrary.getAmountOut(gmxVault, gmxReader, address(usdt), address(dai), usdtBalance);
            }
        }

        return daiBalance;
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {
        return 0;
    }

    function _oracleUsdtToDai(uint256 usdtAmount) internal view returns (uint256) {
        uint256 priceUsdt = uint256(oracleUsdt.latestAnswer());
        uint256 priceDai = uint256(oracleDai.latestAnswer());
        return ChainlinkLibrary.convertTokenToToken(usdtAmount, usdtDm, daiDm, priceUsdt, priceDai);
    }

    function _oracleDaiToUsdt(uint256 daiAmount) internal view returns (uint256) {
        uint256 priceUsdt = uint256(oracleUsdt.latestAnswer());
        uint256 priceDai = uint256(oracleDai.latestAnswer());
        return ChainlinkLibrary.convertTokenToToken(daiAmount, daiDm, usdtDm, priceDai, priceUsdt);
    }

    function _swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin) internal {

        // Gmx Vault has max limit for accepting tokens, for example DAI max capacity: 35kk$
        // If after swap vault of balance more capacity then transaction revert
        // We check capacity and if it not enough then use other swap route (UniswapV3)

        // AmountIn expand to 18 decimal because gmx store all amounts in 18 decimals
        // USDT - 6 decimals => +12 decimals
        // DAI - 18 decimals => +0 decimals
        uint256 capacityAfterSwap = gmxVault.usdgAmounts(address(tokenIn));
        capacityAfterSwap += amountIn * (10 ** (18 - IERC20Metadata(tokenIn).decimals()));
        uint256 maxCapacity = gmxVault.maxUsdgAmounts(address(tokenIn));

        if (maxCapacity > capacityAfterSwap) {
            GmxLibrary.singleSwap(
                gmxRouter,
                address(tokenIn),
                address(tokenOut),
                amountIn,
                amountOutMin
            );
        } else {
            WombatLibrary.swapExactTokensForTokens(
                wombatRouter,
                address(tokenIn),
                address(tokenOut),
                wombatBasePool,
                amountIn,
                amountOutMin,
                address(this)
            );
        }
    }

}
