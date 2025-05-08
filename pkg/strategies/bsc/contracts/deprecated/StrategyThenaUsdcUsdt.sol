// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Gamma.sol";
import "@overnight-contracts/connectors/contracts/stuff/Thena.sol";
import "@overnight-contracts/connectors/contracts/stuff/PancakeV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";

contract StrategyThenaUsdcUsdt is Strategy {

    // --- params

    IERC20 public usdc;
    IERC20 public usdt;
    IERC20 public the;

    IHypervisor public lpToken;
    IUniProxy public uniProxy;
    IGaugeV2 public gauge;

    address public pancakeSwapV3Router;
    address public thenaFusionRouter;

    IPriceFeed public oracleUsdc;
    IPriceFeed public oracleUsdt;

    uint256 public usdcDm;
    uint256 public usdtDm;

    IClearing public clearing;

    // --- structs

    struct StrategyParams {
        address usdc;
        address usdt;
        address the;
        address lpToken;
        address uniProxy;
        address gauge;
        address pancakeSwapV3Router;
        address thenaFusionRouter;
        address oracleUsdc;
        address oracleUsdt;
        address clearing;
    }

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
        usdc = IERC20(params.usdc);
        usdt = IERC20(params.usdt);
        the = IERC20(params.the);

        lpToken = IHypervisor(params.lpToken);
        uniProxy = IUniProxy(params.uniProxy);
        gauge = IGaugeV2(params.gauge);
        clearing = IClearing(params.clearing);

        pancakeSwapV3Router = params.pancakeSwapV3Router;
        thenaFusionRouter = params.thenaFusionRouter;

        oracleUsdc = IPriceFeed(params.oracleUsdc);
        oracleUsdt = IPriceFeed(params.oracleUsdt);

        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();
        usdtDm = 10 ** IERC20Metadata(params.usdt).decimals();

        usdc.approve(address(lpToken), type(uint256).max);
        usdt.approve(address(lpToken), type(uint256).max);
        lpToken.approve(address(gauge), type(uint256).max);
        lpToken.approve(address(uniProxy), type(uint256).max);

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        // swap
        (uint256 amountUsdtCurrent, uint256 amountUsdcCurrent) = lpToken.getTotalAmounts();
        uint256 usdcToSwap = usdc.balanceOf(address(this)) * amountUsdtCurrent / (amountUsdcCurrent * usdtDm / usdcDm + amountUsdtCurrent);
        PancakeSwapV3Library.singleSwap(
            pancakeSwapV3Router,
            address(usdc),
            address(usdt),
            100, // 0.01%
            address(this),
            usdcToSwap,
            OvnMath.subBasisPoints(_oracleUsdcToUsdt(usdcToSwap), swapSlippageBP)
        );

        // deposit in cycle
        IClearing.ClearingPosition memory position = clearing.positions(address(lpToken));
        uint256 token0Amount = usdt.balanceOf(address(this));
        uint256 token1Amount = usdc.balanceOf(address(this));
        while (token0Amount > 0 && token1Amount > 0) {
            (uint256 delta0, uint256 delta1) = _getDepositDeltas(position, token0Amount, token1Amount);
            token0Amount -= delta0;
            token1Amount -= delta1;
            uniProxy.deposit(
                delta0,
                delta1,
                address(this),
                address(lpToken),
                [uint256(0), uint256(0), uint256(0), uint256(0)]
            );
        }

        // stake
        uint256 lpTokenAmount = lpToken.balanceOf(address(this));
        gauge.deposit(lpTokenAmount);
    }

    function _getDepositDeltas(
        IClearing.ClearingPosition memory position,
        uint256 token0Amount,
        uint256 token1Amount
    ) internal returns (uint256 delta0, uint256 delta1) {

        // get reserves
        (uint256 reserve0, uint256 reserve1) = lpToken.getTotalAmounts();

        // set delta0
        if (token0Amount > position.deposit0Max) {
            delta0 = position.deposit0Max;
        } else {
            delta0 = token0Amount;
        }

        // calculate delta1 by delta0
        delta1 = delta0 * reserve1 / reserve0;

        // if delta1 > token1Amount or delta1 > position.deposit1Max
        // set new delta1 and recalculate delta0 by delta1
        // if delta1 <= token1Amount and delta1 <= position.deposit1Max
        // do nothing
        if (delta1 > token1Amount && position.deposit1Max >= token1Amount) {
            delta1 = token1Amount;
            delta0 = delta1 * reserve0 / reserve1;
        } else if (delta1 > position.deposit1Max && token1Amount >= position.deposit1Max) {
            delta1 = position.deposit1Max;
            delta0 = delta1 * reserve0 / reserve1;
        }
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        // count balanceLP for unstake
        (uint256 amountUsdtCurrent, uint256 amountUsdcCurrent) = lpToken.getTotalAmounts();
        uint256 totalLpBalance = lpToken.totalSupply();
        uint256 amountLp = OvnMath.addBasisPoints(_amount, stakeSlippageBP) * totalLpBalance / (amountUsdcCurrent + amountUsdtCurrent * usdcDm / usdtDm);
        uint256 balanceLp = gauge.balanceOf(address(this));
        if (amountLp > balanceLp) {
            amountLp = balanceLp;
        }

        return _unstakeLP(amountLp);
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        // count balanceLP for unstake
        uint256 amountLp = gauge.balanceOf(address(this));
        if (amountLp == 0) {
            return usdc.balanceOf(address(this));
        }

        return _unstakeLP(amountLp);
    }

    function _unstakeLP(uint256 amountLp) internal returns (uint256) {

        // unstake
        gauge.withdraw(amountLp);

        // remove liquidity
        lpToken.withdraw(
            amountLp,
            address(this),
            address(this),
            [uint256(0), uint256(0), uint256(0), uint256(0)]
        );

        // swap
        uint256 usdtBalance = usdt.balanceOf(address(this));
        PancakeSwapV3Library.singleSwap(
            pancakeSwapV3Router,
            address(usdt),
            address(usdc),
            100, // 0.01%
            address(this),
            usdtBalance,
            OvnMath.subBasisPoints(_oracleUsdtToUsdc(usdtBalance), swapSlippageBP)
        );

        return usdc.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue(true);
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue(false);
    }

    function _totalValue(bool nav) internal view returns (uint256) {
        uint256 usdcBalance = usdc.balanceOf(address(this));
        uint256 usdtBalance = usdt.balanceOf(address(this));

        uint256 amountLp = gauge.balanceOf(address(this));
        if (amountLp > 0) {
            (uint256 amountUsdtCurrent, uint256 amountUsdcCurrent) = lpToken.getTotalAmounts();
            usdcBalance += amountUsdcCurrent * amountLp / lpToken.totalSupply();
            usdtBalance += amountUsdtCurrent * amountLp / lpToken.totalSupply();
        }

        if (usdtBalance > 0) {
            if (nav) {
                usdcBalance += _oracleUsdtToUsdc(usdtBalance);
            } else {
                usdcBalance += OvnMath.subBasisPoints(_oracleUsdtToUsdc(usdtBalance), swapSlippageBP);
            }
        }

        return usdcBalance;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        uint256 amountLp = gauge.balanceOf(address(this));
        if (amountLp > 0) {
            gauge.getReward();
        }

        // sell rewards
        uint256 totalUsdc;

        uint256 theBalance = the.balanceOf(address(this));
        if (theBalance > 0) {
            totalUsdc += ThenaFusionLibrary.multiSwap(
                thenaFusionRouter,
                address(the),
                address(usdt),
                address(usdc),
                address(this),
                theBalance,
                0
            );
        }

        // send rewards
        if (totalUsdc > 0) {
            usdc.transfer(_to, totalUsdc);
        }

        return totalUsdc;
    }

    function _oracleUsdtToUsdc(uint256 usdtAmount) internal view returns (uint256) {
        uint256 priceUsdt = uint256(oracleUsdt.latestAnswer());
        uint256 priceUsdc = uint256(oracleUsdc.latestAnswer());
        return ChainlinkLibrary.convertTokenToToken(usdtAmount, usdtDm, usdcDm, priceUsdt, priceUsdc);
    }

    function _oracleUsdcToUsdt(uint256 usdcAmount) internal view returns (uint256) {
        uint256 priceUsdt = uint256(oracleUsdt.latestAnswer());
        uint256 priceUsdc = uint256(oracleUsdc.latestAnswer());
        return ChainlinkLibrary.convertTokenToToken(usdcAmount, usdcDm, usdtDm, priceUsdc, priceUsdt);
    }

}
