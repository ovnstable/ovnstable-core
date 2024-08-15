// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/Sushiswap.sol";
import "@overnight-contracts/connectors/contracts/stuff/Curve.sol";
import "@overnight-contracts/connectors/contracts/stuff/Velodrome.sol";


contract StrategySushiswapUsdcUsdt is Strategy {

    // --- params

    IERC20 public usdc;
    IERC20 public usdt;
    IERC20 public op;
    IERC20 public sushi;

    IBentoBox public bentoBox;
    ITridentRouter public tridentRouter;
    IMiniChefV2 public miniChefV2;
    IStablePool public lpToken;
    uint256 public pid;

    IPriceFeed public oracleUsdc;
    IPriceFeed public oracleUsdt;

    address public curve3Pool;
    IRouter public velodromeRouter;
    address public rewardWallet;

    uint256 public usdcDm;
    uint256 public usdtDm;

    // --- events

    event StrategyUpdatedParams();

    // --- structs

    struct StrategyParams {
        address usdc;
        address usdt;
        address op;
        address sushi;
        address bentoBox;
        address tridentRouter;
        address miniChefV2;
        address lpToken;
        uint256 pid;
        address oracleUsdc;
        address oracleUsdt;
        address curve3Pool;
        address velodromeRouter;
        address rewardWallet;
    }

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
        op = IERC20(params.op);
        sushi = IERC20(params.sushi);

        bentoBox = IBentoBox(params.bentoBox);
        tridentRouter = ITridentRouter(params.tridentRouter);
        miniChefV2 = IMiniChefV2(params.miniChefV2);
        lpToken = IStablePool(params.lpToken);
        pid = params.pid;

        oracleUsdc = IPriceFeed(params.oracleUsdc);
        oracleUsdt = IPriceFeed(params.oracleUsdt);

        curve3Pool = params.curve3Pool;
        velodromeRouter = IRouter(params.velodromeRouter);
        rewardWallet = params.rewardWallet;

        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();
        usdtDm = 10 ** IERC20Metadata(params.usdt).decimals();

        bentoBox.setMasterContractApproval(address(this), address(tridentRouter), true, 0, '', '');

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        // swap needed amount usdc to usdt
        uint256 totalLpBalance = lpToken.totalSupply();
        (uint256 reserveUsdc, uint256 reserveUsdt) = lpToken.getNativeReserves();
        require(reserveUsdc > 10 ** 3 && reserveUsdt > 10 ** 3, 'Liquidity lpToken reserves too low');

        uint256 usdcBalance = usdc.balanceOf(address(this));

        uint256 amountUsdc = CurveLibrary.getAmountToSwap(
            curve3Pool,
            address(usdc),
            address(usdt),
            usdcBalance,
            reserveUsdc,
            reserveUsdt,
            usdcDm,
            usdtDm,
            1
        );

        CurveLibrary.swap(
            curve3Pool,
            address(usdc),
            address(usdt),
            amountUsdc,
            OvnMath.subBasisPoints(_oracleUsdcToUsdt(amountUsdc), swapSlippageBP)
        );

        // create params and calculate min liquidity
        usdcBalance = usdc.balanceOf(address(this));
        uint256 usdtBalance = usdt.balanceOf(address(this));

        ITridentRouter.TokenInput memory usdcInput;
        usdcInput.token = address(usdc);
        usdcInput.native = true;
        usdcInput.amount = usdcBalance;

        ITridentRouter.TokenInput memory usdtInput;
        usdtInput.token = address(usdt);
        usdtInput.native = true;
        usdtInput.amount = usdtBalance;

        ITridentRouter.TokenInput[] memory tokenInput = new ITridentRouter.TokenInput[](2);
        tokenInput[0] = usdcInput;
        tokenInput[1] = usdtInput;

        uint256 minLiquidity = OvnMath.subBasisPoints(usdcBalance * totalLpBalance / reserveUsdc, stakeSlippageBP);

        // add liquidity
        usdc.approve(address(bentoBox), usdcBalance);
        usdt.approve(address(bentoBox), usdtBalance);
        tridentRouter.addLiquidity(
            tokenInput,
            address(lpToken),
            minLiquidity,
            abi.encode(address(this))
        );

        uint256 lpTokenBalance = lpToken.balanceOf(address(this));
        lpToken.approve(address(miniChefV2), lpTokenBalance);
        miniChefV2.deposit(pid, lpTokenBalance, address(this));
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        // get lpToken amount to unstake
        uint256 totalLpBalance = lpToken.totalSupply();
        (uint256 reserveUsdc, uint256 reserveUsdt) = lpToken.getNativeReserves();
        uint256 amountLp = CurveLibrary.getAmountLpTokens(
            curve3Pool,
            address(usdc),
            address(usdt),
            // add 1 basis point and 0.001 usdc to unstake more than required
            OvnMath.addBasisPoints(_amount, 1) + 1000,
            totalLpBalance,
            reserveUsdc,
            reserveUsdt,
            usdcDm,
            usdtDm,
            1
        );

        (uint256 lpTokenBalance,) = miniChefV2.userInfo(pid, address(this));
        if (amountLp > lpTokenBalance) {
            amountLp = lpTokenBalance;
        }

        // unstake
        miniChefV2.withdraw(pid, amountLp, address(this));

        // calculate min amounts
        uint256 amountUsdc = OvnMath.subBasisPoints(reserveUsdc * amountLp / totalLpBalance, stakeSlippageBP);
        uint256 amountUsdt = OvnMath.subBasisPoints(reserveUsdt * amountLp / totalLpBalance, stakeSlippageBP);

        ITridentRouter.TokenAmount memory usdcAmount;
        usdcAmount.token = address(usdc);
        usdcAmount.amount = amountUsdc;

        ITridentRouter.TokenAmount memory usdtAmount;
        usdtAmount.token = address(usdt);
        usdtAmount.amount = amountUsdt;

        ITridentRouter.TokenAmount[] memory minWithdrawals = new ITridentRouter.TokenAmount[](2);
        minWithdrawals[0] = usdcAmount;
        minWithdrawals[1] = usdtAmount;

        // remove liquidity
        lpToken.approve(address(tridentRouter), amountLp);
        tridentRouter.burnLiquidity(
            address(lpToken),
            amountLp,
            abi.encode(address(this), true),
            minWithdrawals
        );

        // swap usdt to usdc
        uint256 usdtBalance = usdt.balanceOf(address(this));
        CurveLibrary.swap(
            curve3Pool,
            address(usdt),
            address(usdc),
            usdtBalance,
            OvnMath.subBasisPoints(_oracleUsdtToUsdc(usdtBalance), swapSlippageBP)
        );

        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        // get lpToken amount to unstake
        (uint256 lpTokenBalance,) = miniChefV2.userInfo(pid, address(this));
        if (lpTokenBalance == 0) {
            return usdc.balanceOf(address(this));
        }

        // unstake
        miniChefV2.withdraw(pid, lpTokenBalance, address(this));

        // calculate min amounts
        uint256 totalLpBalance = lpToken.totalSupply();
        (uint256 reserveUsdc, uint256 reserveUsdt) = lpToken.getNativeReserves();
        uint256 amountUsdc = OvnMath.subBasisPoints(reserveUsdc * lpTokenBalance / totalLpBalance, stakeSlippageBP);
        uint256 amountUsdt = OvnMath.subBasisPoints(reserveUsdt * lpTokenBalance / totalLpBalance, stakeSlippageBP);

        ITridentRouter.TokenAmount memory usdcAmount;
        usdcAmount.token = address(usdc);
        usdcAmount.amount = amountUsdc;

        ITridentRouter.TokenAmount memory usdtAmount;
        usdtAmount.token = address(usdt);
        usdtAmount.amount = amountUsdt;

        ITridentRouter.TokenAmount[] memory minWithdrawals = new ITridentRouter.TokenAmount[](2);
        minWithdrawals[0] = usdcAmount;
        minWithdrawals[1] = usdtAmount;

        // remove liquidity
        lpToken.approve(address(tridentRouter), lpTokenBalance);
        tridentRouter.burnLiquidity(
            address(lpToken),
            lpTokenBalance,
            abi.encode(address(this), true),
            minWithdrawals
        );

        // swap usdt to usdc
        uint256 usdtBalance = usdt.balanceOf(address(this));
        CurveLibrary.swap(
            curve3Pool,
            address(usdt),
            address(usdc),
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

        (uint256 lpTokenBalance,) = miniChefV2.userInfo(pid, address(this));
        if (lpTokenBalance > 0) {
            uint256 totalLpBalance = lpToken.totalSupply();
            (uint256 reserveUsdc, uint256 reserveUsdt) = lpToken.getNativeReserves();
            usdcBalance += reserveUsdc * lpTokenBalance / totalLpBalance;
            usdtBalance += reserveUsdt * lpTokenBalance / totalLpBalance;
        }

        if (usdtBalance > 0) {
            if (nav) {
                usdcBalance += _oracleUsdtToUsdc(usdtBalance);
            } else {
                usdcBalance += CurveLibrary.getAmountOut(curve3Pool, address(usdt), address(usdc), usdtBalance);
            }
        }

        return usdcBalance;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        (uint256 lpTokenBalance,) = miniChefV2.userInfo(pid, address(this));
        if (lpTokenBalance > 0) {
            miniChefV2.harvest(pid, address(this));
        }

        // send sushi to rewardWallet
        uint256 sushiBalance = sushi.balanceOf(address(this));
        if (sushiBalance > 0) {
            sushi.transfer(rewardWallet, sushiBalance);
        }

        // sell rewards
        uint256 totalUsdc;

        uint256 opBalance = op.balanceOf(address(this));
        if (opBalance > 0) {
            uint256 amountOut = VelodromeLibrary.getAmountsOut(
                velodromeRouter,
                address(op),
                address(usdc),
                false,
                opBalance
            );
            if (amountOut > 0) {
                totalUsdc += VelodromeLibrary.singleSwap(
                    velodromeRouter,
                    address(op),
                    address(usdc),
                    false,
                    opBalance,
                    amountOut * 99 / 100,
                    address(this)
                );
            }
        }

        if (totalUsdc > 0) {
            usdc.transfer(_to, totalUsdc);
        }

        return totalUsdc;
    }

    function _oracleUsdtToUsdc(uint256 usdtAmount) internal view returns (uint256) {
        uint256 priceUsdt = ChainlinkLibrary.getPrice(oracleUsdt);
        uint256 priceUsdc = ChainlinkLibrary.getPrice(oracleUsdc);
        return ChainlinkLibrary.convertTokenToToken(usdtAmount, usdtDm, usdcDm, priceUsdt, priceUsdc);
    }

    function _oracleUsdcToUsdt(uint256 usdcAmount) internal view returns (uint256) {
        uint256 priceUsdt = ChainlinkLibrary.getPrice(oracleUsdt);
        uint256 priceUsdc = ChainlinkLibrary.getPrice(oracleUsdc);
        return ChainlinkLibrary.convertTokenToToken(usdcAmount, usdcDm, usdtDm, priceUsdc, priceUsdt);
    }
}
