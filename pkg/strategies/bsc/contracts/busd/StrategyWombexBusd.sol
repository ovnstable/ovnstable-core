// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Wombex.sol";
import "@overnight-contracts/connectors/contracts/stuff/PancakeV2.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";

import "hardhat/console.sol";

contract StrategyWombexBusd is Strategy {

    // --- structs

    struct StrategyParams {
        address busdToken;
        address womToken;
        address wmxToken;
        address lpBusd;
        address wmxLpBusd;
        address poolDepositor;
        address pancakeRouter;
    }

    // --- params

    IERC20 public busdToken;
    IERC20 public womToken;
    IERC20 public wmxToken;

    IAsset public lpBusd;
    IBaseRewardPool public wmxLpBusd;
    IPoolDepositor public poolDepositor;
    IPool public pool;

    IPancakeRouter02 public pancakeRouter;

    uint256 public lpBusdTokenDenominator;

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
        womToken = IERC20(params.womToken);
        wmxToken = IERC20(params.wmxToken);

        lpBusd = IAsset(params.lpBusd);
        wmxLpBusd = IBaseRewardPool(params.wmxLpBusd);
        poolDepositor = IPoolDepositor(params.poolDepositor);
        pool = IPool(poolDepositor.pool());

        pancakeRouter = IPancakeRouter02(params.pancakeRouter);

        lpBusdTokenDenominator = 10 ** IERC20Metadata(params.lpBusd).decimals();

        busdToken.approve(address(poolDepositor), type(uint256).max);
        wmxLpBusd.approve(address(poolDepositor), type(uint256).max);

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(busdToken), "Some token not compatible");

        uint256 busdBalance = busdToken.balanceOf(address(this));
        console.log("busdBalance before deposit: %s", busdToken.balanceOf(address(this)));
        (uint256 lpBusdAmount,) = pool.quotePotentialDeposit(address(busdToken), busdBalance);
        poolDepositor.deposit(address(lpBusd), busdBalance, OvnMath.subBasisPoints(lpBusdAmount, 1), true);
        console.log("busdBalance after deposit: %s", busdToken.balanceOf(address(this)));
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(busdToken), "Some token not compatible");

        // get amount to unstake
        (uint256 busdAmountOneAsset,) = pool.quotePotentialWithdraw(address(busdToken), lpBusdTokenDenominator);
        // add 1bp for smooth withdraw
        uint256 lpBusdAmount = OvnMath.addBasisPoints(_amount, 1) * lpBusdTokenDenominator / busdAmountOneAsset;
        console.log("lpBusdAmount: %s", lpBusdAmount);

        console.log("busdBalance before withdraw: %s", busdToken.balanceOf(address(this)));
        poolDepositor.withdraw(address(lpBusd), lpBusdAmount, _amount);
        console.log("busdBalance after withdraw: %s", busdToken.balanceOf(address(this)));
        return busdToken.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(busdToken), "Some token not compatible");

        console.log("busdBalance before withdraw: %s", busdToken.balanceOf(address(this)));
        uint256 lpBusdBalance = wmxLpBusd.balanceOf(address(this));
        console.log("lpBusdBalance before withdraw: %s", lpBusdBalance);
        if (lpBusdBalance > 0) {
            (uint256 busdAmount,) = pool.quotePotentialWithdraw(address(busdToken), lpBusdBalance);
            poolDepositor.withdraw(address(lpBusd), lpBusdBalance, OvnMath.subBasisPoints(busdAmount, 1));
        }
        console.log("lpBusdBalance after withdraw: %s", wmxLpBusd.balanceOf(address(this)));
        console.log("busdBalance after withdraw: %s", busdToken.balanceOf(address(this)));
        return busdToken.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue(true);
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue(false);
    }

    function _totalValue(bool nav) internal view returns (uint256) {
        uint256 busdBalance = busdToken.balanceOf(address(this));

        uint256 wmxLpBusdBalance = wmxLpBusd.balanceOf(address(this));
        if (wmxLpBusdBalance > 0) {
            if (nav) {
                (uint256 busdAmountOneAsset,) = pool.quotePotentialWithdraw(address(busdToken), lpBusdTokenDenominator);
                busdBalance += wmxLpBusdBalance * busdAmountOneAsset / lpBusdTokenDenominator;
                console.log("nav: %s", busdBalance);
            } else {
                (uint256 busdAmount,) = pool.quotePotentialWithdraw(address(busdToken), wmxLpBusdBalance);
                busdBalance += busdAmount;
                console.log("liq: %s", busdBalance);
            }
        }

        return busdBalance;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        uint256 lpBusdBalance = wmxLpBusd.balanceOf(address(this));
        console.log("lpBusdBalance: %s", lpBusdBalance);
        if (lpBusdBalance > 0) {
            wmxLpBusd.getReward(address(this), false);
        }

        // sell rewards
        uint256 totalBusd;

        uint256 womBalance = womToken.balanceOf(address(this));
        console.log("womBalance: %s", womBalance);
        if (womBalance > 0) {
            uint256 amountOut = PancakeSwapLibrary.getAmountsOut(
                pancakeRouter,
                address(womToken),
                address(busdToken),
                womBalance
            );

            if (amountOut > 0) {
                uint256 womBusd = PancakeSwapLibrary.swapExactTokensForTokens(
                    pancakeRouter,
                    address(womToken),
                    address(busdToken),
                    womBalance,
                    amountOut * 99 / 100,
                    address(this)
                );
                console.log("womBusd: %s", womBusd);

                totalBusd += womBusd;
            }
        }

        uint256 wmxBalance = wmxToken.balanceOf(address(this));
        console.log("wmxBalance: %s", wmxBalance);
        if (wmxBalance > 0) {
            uint256 amountOut = PancakeSwapLibrary.getAmountsOut(
                pancakeRouter,
                address(wmxToken),
                address(busdToken),
                wmxBalance
            );

            if (amountOut > 0) {
                uint256 wmxBusd = PancakeSwapLibrary.swapExactTokensForTokens(
                    pancakeRouter,
                    address(wmxToken),
                    address(busdToken),
                    wmxBalance,
                    amountOut * 99 / 100,
                    address(this)
                );
                console.log("wmxBusd: %s", wmxBusd);

                totalBusd += wmxBusd;
            }
        }

        if (totalBusd > 0) {
            busdToken.transfer(_to, totalBusd);
        }

        console.log("totalBusd: %s", totalBusd);
        return totalBusd;
    }

}
