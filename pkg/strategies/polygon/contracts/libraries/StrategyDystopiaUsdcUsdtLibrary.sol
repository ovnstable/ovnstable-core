// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../connectors/aave/interfaces/IPoolAddressesProvider.sol";
import "../connectors/aave/interfaces/IPriceFeed.sol";
import "../connectors/aave/interfaces/IPool.sol";
import "../connectors/arrakis/IArrakisVault.sol";
import "../connectors/balancer/interfaces/IVault.sol";
import "../StrategyBorrowDystopiaUsdcUsdt.sol";
import "./OvnMath.sol";
import "./AaveBorrowLibrary.sol";

library StrategyDystopiaUsdcUsdtLibrary {

    uint256 constant BASIS_POINTS_FOR_SLIPPAGE = 4; // 0.04%
    uint256 constant BASIS_POINTS_FOR_STORAGE = 100; // 1%

    function _getLiquidityForToken(StrategyBorrowDystopiaUsdcUsdt self, uint256 token0Borrow) public view returns (uint256) {
        (, uint256 amount1Current) = _getUnderlyingBalances(self);
        uint256 amountLp = token0Borrow * self.dystVault().totalSupply() / amount1Current;
        return amountLp;
    }

    function _getTokensForLiquidity(StrategyBorrowDystopiaUsdcUsdt self, uint256 balanceLp) public view returns (uint256, uint256) {
        (uint256 amount0Current, uint256 amount1Current) = _getUnderlyingBalances(self);

        uint256 amountLiq0 = amount0Current * balanceLp / self.dystVault().totalSupply();
        uint256 amountLiq1 = amount1Current * balanceLp / self.dystVault().totalSupply();
        return (self.usdcTokenInversion() == 0) ? (amountLiq0, amountLiq1) : (amountLiq0, amountLiq1);
    }

    function _getUnderlyingBalances(StrategyBorrowDystopiaUsdcUsdt self) public view returns (uint256, uint256) {
        (uint256 amount0, uint256 amount1,) = self.dystVault().getReserves();
        return (self.usdcTokenInversion() == 0) ? (amount0, amount1) : (amount1, amount0);
    }


    function _addLiquidityAndStakeWithSlippage(StrategyBorrowDystopiaUsdcUsdt self, uint256 usdcAmount, uint256 token0Amount) public {
        if (usdcAmount != 0) {
            self.usdcToken().approve(address(self.dystRouter()), usdcAmount);
        }
        if (token0Amount != 0) {
            self.token0().approve(address(self.dystRouter()), token0Amount);
        }
        if (self.usdcTokenInversion() == 0) {
            self.dystRouter().addLiquidity(
                address(self.usdcToken()),
                address(self.token0()),
                true,
                usdcAmount,
                token0Amount,
                (usdcAmount < 10000) ? 0 : OvnMath.subBasisPoints(usdcAmount, BASIS_POINTS_FOR_SLIPPAGE),
                (token0Amount < 10000) ? 0 : OvnMath.subBasisPoints(token0Amount, BASIS_POINTS_FOR_SLIPPAGE),
                address(self),
                block.timestamp + 600
            );
        } else {
            self.dystRouter().addLiquidity(
                address(self.token0()),
                address(self.usdcToken()),
                true,
                usdcAmount,
                token0Amount,
                (usdcAmount < 10000) ? 0 : OvnMath.subBasisPoints(token0Amount, BASIS_POINTS_FOR_SLIPPAGE),
                (token0Amount < 10000) ? 0 : OvnMath.subBasisPoints(usdcAmount, BASIS_POINTS_FOR_SLIPPAGE),
                address(self),
                block.timestamp + 600
            );
        }
    }

    function _removeLiquidityAndUnstakeWithSlippage(StrategyBorrowDystopiaUsdcUsdt self, uint256 amountLp) public returns (uint256, uint256) {
        (uint256 amountLiq0, uint256 amountLiq1) = _getTokensForLiquidity(self, amountLp);
        (uint256 amount0, uint256 amount1) = self.dystRouter().removeLiquidity(
            address(self.usdcToken()),
            address(self.token0()),
            true,
            amountLp,
            (amountLiq0 == 0) ? 0 : OvnMath.subBasisPoints(amountLiq0, BASIS_POINTS_FOR_SLIPPAGE),
            (amountLiq1 == 0) ? 0 : OvnMath.subBasisPoints(amountLiq1, BASIS_POINTS_FOR_SLIPPAGE),
            address(self),
            block.timestamp + 600
        );

        return (self.usdcTokenInversion() == 0) ? (amount0, amount1) : (amount1, amount0);
    }


    function _healthFactorBalanceI(StrategyBorrowDystopiaUsdcUsdt self) public returns (uint256) {

        IPool aavePool = _aavePoolEm(self);
        (,,,,,uint256 healthFactorCurrent) = aavePool.getUserAccountData(address(self));

        if (healthFactorCurrent > 10 ** 20 || OvnMath.abs(healthFactorCurrent, self.healthFactor()) < self.balancingDelta()) {
            return healthFactorCurrent;
        }

        if (healthFactorCurrent > self.healthFactor()) {            _healthFactorBalanceILt(self);
        } else {
            _healthFactorBalanceIGt(self);
        }

        return healthFactorCurrent;
    }

    function _healthFactorBalanceILt(StrategyBorrowDystopiaUsdcUsdt self) public {
        IPool aavePool = _aavePoolEm(self);

        (uint256 collateral, uint256 borrow,,,,) = aavePool.getUserAccountData(address(self));
        (uint256 amount0Current, uint256 amount1Current) = _getUnderlyingBalances(self);

        AaveBorrowLibrary.GetWithdrawAmountForBalanceParams memory params = AaveBorrowLibrary.GetWithdrawAmountForBalanceParams(
            collateral,
            borrow,
            amount0Current,
            amount1Current,
            self.liquidationThreshold(),
            self.healthFactor(),
            self.usdcTokenDenominator(),
            self.token0Denominator(),
            uint256(self.oracleChainlinkUsdc().latestAnswer()),
            uint256(self.oracleChainlinkToken0().latestAnswer())
        );

        uint256 neededUsdc = AaveBorrowLibrary.getWithdrawAmountForBalance(
            params
        );
        aavePool.withdraw(address(self.usdcToken()), neededUsdc, address(self));
        (params.totalCollateralUsd, params.totalBorrowUsd,,,,) = aavePool.getUserAccountData(address(self));
        uint256 neededToken0 = AaveBorrowLibrary.getBorrowIfZeroAmountForBalance(params);
        aavePool.borrow(address(self.token0()), neededToken0, self.interestRateMode(), self.referralCode(), address(self));
        _addLiquidityAndStakeWithSlippage(self, neededUsdc, neededToken0);
        uint256 lpTokenBalance = self.dystVault().balanceOf(address(this));
        self.dystVault().approve(address(self.userProxy()), lpTokenBalance);
        self.userProxy().depositLpAndStake(address(self.dystVault()), lpTokenBalance);
    }

    function _healthFactorBalanceIGt(StrategyBorrowDystopiaUsdcUsdt self) public {
        IPool aavePool = _aavePoolEm(self);
        (uint256 collateral, uint256 borrow,,,,) = aavePool.getUserAccountData(address(self));
        (uint256 amount0Current, uint256 amount1Current) = _getUnderlyingBalances(self);
        AaveBorrowLibrary.GetLpTokensForBalanceParams memory params = AaveBorrowLibrary.GetLpTokensForBalanceParams(
            collateral,
            borrow,
            amount0Current,
            amount1Current,
            self.liquidationThreshold(),
            self.healthFactor(),
            self.usdcTokenDenominator(),
            self.token0Denominator(),
            uint256(self.oracleChainlinkUsdc().latestAnswer()),
            uint256(self.oracleChainlinkToken0().latestAnswer()),
            self.dystVault().totalSupply()
        );

        uint256 amountLp = AaveBorrowLibrary.getLpTokensForBalance(params);
        self.userProxy().unstakeLpAndWithdraw(address(self.dystVault()), amountLp);
        self.dystVault().approve(address(self.dystRouter()), amountLp);
        (uint256 amount0, uint256 amount1) = _removeLiquidityAndUnstakeWithSlippage(self, amountLp);

        self.usdcToken().approve(address(aavePool), amount0);
        aavePool.supply(address(self.usdcToken()), amount0, address(self), self.referralCode());

        self.token0().approve(address(aavePool), amount1);
        aavePool.repay(address(self.token0()), amount1, self.interestRateMode(), address(self));
    }

    function _aavePoolEm(StrategyBorrowDystopiaUsdcUsdt self) public returns (IPool aavePool){
        aavePool = IPool(AaveBorrowLibrary.getAavePool(address(self.aavePoolAddressesProvider()), self.eModeCategoryId()));
    }
}
