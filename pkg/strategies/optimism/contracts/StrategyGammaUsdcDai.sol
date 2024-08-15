// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/Gamma.sol";
import "@overnight-contracts/connectors/contracts/stuff/Curve.sol";


contract StrategyGammaUsdcDai is Strategy {

    // --- events

    IERC20 public usdc;
    IERC20 public dai;
    IERC20 public op;

    IHypervisor public lpToken;
    IUniProxy public uniProxy;
    IMasterChef public masterChef;
    uint256 public pid;

    ISwapRouter public uniswapV3Router;
    uint24 public poolFeeOpUsdc;

    IPriceFeed public oracleUsdc;
    IPriceFeed public oracleDai;

    uint256 public usdcDm;
    uint256 public daiDm;

    address public curve3Pool;

    // --- structs

    struct StrategyParams {
        address usdc;
        address dai;
        address op;
        address lpToken;
        address uniProxy;
        address masterChef;
        uint64 pid;
        address uniswapV3Router;
        uint24 poolFeeOpUsdc;
        address oracleUsdc;
        address oracleDai;
        address curve3Pool;
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
        dai = IERC20(params.dai);
        op = IERC20(params.op);

        lpToken = IHypervisor(params.lpToken);
        uniProxy = IUniProxy(params.uniProxy);
        masterChef = IMasterChef(params.masterChef);
        pid = params.pid;

        uniswapV3Router = ISwapRouter(params.uniswapV3Router);
        poolFeeOpUsdc = params.poolFeeOpUsdc;

        oracleUsdc = IPriceFeed(params.oracleUsdc);
        oracleDai = IPriceFeed(params.oracleDai);

        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();
        daiDm = 10 ** IERC20Metadata(params.dai).decimals();

        curve3Pool = params.curve3Pool;

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(usdc), "Some token not compatible");

        // calculate needed USDC to swap to DAI
        (uint256 amountUsdcCurrent, uint256 amountDaiCurrent) = lpToken.getTotalAmounts();
        uint256 usdcBalance = usdc.balanceOf(address(this));
        uint256 amountUsdcToSwap = CurveLibrary.getAmountToSwap(
            curve3Pool,
            address(usdc),
            address(dai),
            usdcBalance,
            amountUsdcCurrent,
            amountDaiCurrent,
            usdcDm,
            daiDm,
            1
        );

        // swap USDC to needed DAI amount
        uint256 daiMinAmount = OvnMath.subBasisPoints(_oracleUsdcToDai(amountUsdcToSwap), swapSlippageBP) - 1e13;
        CurveLibrary.swap(
            curve3Pool,
            address(usdc),
            address(dai),
            amountUsdcToSwap,
            daiMinAmount
        );

        // approve deposit balances
        usdcBalance = usdc.balanceOf(address(this));
        uint256 daiBalance = dai.balanceOf(address(this));
        usdc.approve(address(lpToken), usdcBalance);
        dai.approve(address(lpToken), daiBalance);

        // get token0Amount and token1Amount
        IUniProxy.Position memory position = uniProxy.positions(address(lpToken));
        uint256 token0Amount = usdcBalance;
        uint256 token1Amount = daiBalance;

        // deposit in cycle
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
        lpToken.approve(address(masterChef), lpTokenAmount);
        masterChef.deposit(pid, lpTokenAmount, address(this));
    }

    function _getDepositDeltas(
        IUniProxy.Position memory position,
        uint256 token0Amount,
        uint256 token1Amount
    ) internal returns (uint256 delta0, uint256 delta1) {

        if (token0Amount <= position.deposit0Max && token1Amount <= position.deposit1Max) {
            return (token0Amount, token1Amount);
        }

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

        require(_asset == address(usdc), "Some token not compatible");

        // calculating need amount lp - depends on amount USDC/DAI
        (uint256 amountUsdcCurrent, uint256 amountDaiCurrent) = lpToken.getTotalAmounts();
        uint256 totalLpBalance = lpToken.totalSupply();
        uint256 amountLp = CurveLibrary.getAmountLpTokens(
            curve3Pool,
            address(usdc),
            address(dai),
            OvnMath.addBasisPoints(_amount + 10, 1),
            totalLpBalance,
            amountUsdcCurrent,
            amountDaiCurrent,
            usdcDm,
            daiDm,
            1
        );
        if (amountLp > totalLpBalance) {
            amountLp = totalLpBalance;
        }

        // unstake
        masterChef.withdraw(pid, amountLp, address(this));

        // remove liquidity
        lpToken.approve(address(uniProxy), amountLp);
        lpToken.withdraw(
            amountLp,
            address(this),
            address(this),
            [uint256(0), uint256(0), uint256(0), uint256(0)]
        );

        // swap dai to usdc
        uint256 daiBalance = dai.balanceOf(address(this));
        uint256 usdcMinAmount = OvnMath.subBasisPoints(_oracleDaiToUsdc(daiBalance), swapSlippageBP) - 10;
        CurveLibrary.swap(
            curve3Pool,
            address(dai),
            address(usdc),
            daiBalance,
            usdcMinAmount
        );

        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdc), "Some token not compatible");

        // count balanceLP for unstake
        (uint256 amountLp,) = masterChef.userInfo(pid, address(this));
        if (amountLp == 0) {
            return usdc.balanceOf(address(this));
        }

        // unstake
        masterChef.withdraw(pid, amountLp, address(this));

        // remove liquidity
        lpToken.approve(address(uniProxy), amountLp);
        lpToken.withdraw(
            amountLp,
            address(this),
            address(this),
            [uint256(0), uint256(0), uint256(0), uint256(0)]
        );

        // swap dai to usdc
        uint256 daiBalance = dai.balanceOf(address(this));
        uint256 usdcMinAmount = OvnMath.subBasisPoints(_oracleDaiToUsdc(daiBalance), swapSlippageBP) - 10;
        CurveLibrary.swap(
            curve3Pool,
            address(dai),
            address(usdc),
            daiBalance,
            usdcMinAmount
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
        uint256 daiBalance = dai.balanceOf(address(this));

        (uint256 amountLp,) = masterChef.userInfo(pid, address(this));
        if (amountLp > 0) {
            (uint256 amountUsdcCurrent, uint256 amountDaiCurrent) = lpToken.getTotalAmounts();
            usdcBalance += amountUsdcCurrent * amountLp / lpToken.totalSupply();
            daiBalance += amountDaiCurrent * amountLp / lpToken.totalSupply();
        }

        if (daiBalance > 0) {
            if (nav) {
                usdcBalance += _oracleDaiToUsdc(daiBalance);
            } else {
                usdcBalance += CurveLibrary.getAmountOut(
                    curve3Pool,
                    address(dai),
                    address(usdc),
                    daiBalance
                );
            }
        }

        return usdcBalance;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        (uint256 amountLp,) = masterChef.userInfo(pid, address(this));
        if (amountLp > 0) {
            masterChef.deposit(pid, 0, address(this));
        }

        // sell rewards
        uint256 totalUsdc;

        uint256 opBalance = op.balanceOf(address(this));
        if (opBalance > 0) {
            totalUsdc += UniswapV3Library.singleSwap(
                uniswapV3Router,
                address(op),
                address(usdc),
                poolFeeOpUsdc,
                address(this),
                opBalance,
                0
            );
        }

        if (totalUsdc > 0) {
            usdc.transfer(_to, totalUsdc);
        }

        return totalUsdc;
    }

    function _oracleDaiToUsdc(uint256 daiAmount) internal view returns (uint256) {
        uint256 priceDai = uint256(oracleDai.latestAnswer());
        uint256 priceUsdc = uint256(oracleUsdc.latestAnswer());
        return ChainlinkLibrary.convertTokenToToken(daiAmount, daiDm, usdcDm, priceDai, priceUsdc);
    }

    function _oracleUsdcToDai(uint256 usdcAmount) internal view returns (uint256) {
        uint256 priceDai = uint256(oracleDai.latestAnswer());
        uint256 priceUsdc = uint256(oracleUsdc.latestAnswer());
        return ChainlinkLibrary.convertTokenToToken(usdcAmount, usdcDm, daiDm, priceUsdc, priceDai);
    }

}
