// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../connectors/aave/interfaces/IPoolAddressesProvider.sol";
import "../connectors/aave/interfaces/IPriceFeed.sol";
import "../connectors/aave/interfaces/IPool.sol";
import "../connectors/arrakis/IArrakisVault.sol";
import "../connectors/balancer/interfaces/IVault.sol";
import "../StrategyArrakisUsdt.sol";
import "./OvnMath.sol";
import "./AaveBorrowLibrary.sol";
import "hardhat/console.sol";

library StrategyArrakisUsdtLibrary {

    uint256 constant BASIS_POINTS_FOR_SLIPPAGE = 4; // 0.04%
    uint256 constant BASIS_POINTS_FOR_STORAGE = 100; // 1%

    function _getLiquidityForToken(StrategyArrakisUsdt self, uint256 token0Borrow) public view returns (uint256) {
        (, uint256 amount1Current) = _getUnderlyingBalances(self);
        uint256 amountLp = token0Borrow * self.arrakisVault().totalSupply() / amount1Current;
        return amountLp;
    }

    function _getTokensForLiquidity(StrategyArrakisUsdt self, uint256 balanceLp) public view returns (uint256, uint256) {
        (uint256 amount0Current, uint256 amount1Current) = _getUnderlyingBalances(self);

        uint256 amountLiq0 = amount0Current * balanceLp / self.arrakisVault().totalSupply();
        uint256 amountLiq1 = amount1Current * balanceLp / self.arrakisVault().totalSupply();
        return (self.usdcTokenInversion() == 0) ? (amountLiq0, amountLiq1) : (amountLiq0, amountLiq1);
    }

    function _getUnderlyingBalances(StrategyArrakisUsdt self) public view returns (uint256, uint256) {
        (uint256 amount0, uint256 amount1) = self.arrakisVault().getUnderlyingBalances();
        return (self.usdcTokenInversion() == 0) ? (amount0, amount1) : (amount1, amount0);
    }




    function _addLiquidityAndStakeWithSlippage(StrategyArrakisUsdt self, uint256 usdcAmount, uint256 token0Amount) public {
        if (self.usdcTokenInversion() == 0) {
            self.arrakisRouter().addLiquidityAndStake(
                address(self.arrakisRewards()),
                usdcAmount,
                token0Amount,
                OvnMath.subBasisPoints(usdcAmount, BASIS_POINTS_FOR_SLIPPAGE),
                OvnMath.subBasisPoints(token0Amount, BASIS_POINTS_FOR_SLIPPAGE),
                address(self)
            );
        } else {
            self.arrakisRouter().addLiquidityAndStake(
                address(self.arrakisRewards()),
                token0Amount,
                usdcAmount,
                OvnMath.subBasisPoints(token0Amount, BASIS_POINTS_FOR_SLIPPAGE),
                OvnMath.subBasisPoints(usdcAmount, BASIS_POINTS_FOR_SLIPPAGE),
                address(self)
            );
        }
    }

    function _removeLiquidityAndUnstakeWithSlippage(StrategyArrakisUsdt self, uint256 amountLp) public returns (uint256, uint256) {
        (uint256 amountLiq0, uint256 amountLiq1) = _getTokensForLiquidity(self, amountLp);
        (uint256 amount0, uint256 amount1,) = self.arrakisRouter().removeLiquidityAndUnstake(
            address(self.arrakisRewards()),
            amountLp,
            (amountLiq0 == 0) ? 0 : OvnMath.subBasisPoints(amountLiq0, BASIS_POINTS_FOR_SLIPPAGE),
            (amountLiq1 == 0) ? 0 : OvnMath.subBasisPoints(amountLiq1, BASIS_POINTS_FOR_SLIPPAGE),
            address(self)
        );

        return (self.usdcTokenInversion() == 0) ? (amount0, amount1) : (amount1, amount0);
    }


    function _healthFactorBalanceI(StrategyArrakisUsdt self) public returns (uint256) {

        IPool aavePool = _aavePoolEm(self);
        (,,,,,uint256 healthFactorCurrent) = aavePool.getUserAccountData(address(self));

        if (OvnMath.abs(healthFactorCurrent, self.healthFactor()) < self.balancingDelta()) {
            return healthFactorCurrent;
        }

        if (healthFactorCurrent > self.healthFactor()) {
            _healthFactorBalanceILt(self);
        } else {
            _healthFactorBalanceIGt(self);
        }

        (,,,,, healthFactorCurrent) = aavePool.getUserAccountData(address(self));
        return healthFactorCurrent;
    }

    function _healthFactorBalanceILt(StrategyArrakisUsdt self) internal {
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

        if (amount0Current == 0) {
            uint256 neededToken0 = AaveBorrowLibrary.getBorrowIfZeroAmountForBalance(params);
            aavePool.borrow(address(self.token0()), neededToken0, self.interestRateMode(), self.referralCode(), address(self));
            self.token0().approve(address(self.arrakisRouter()), neededToken0);
            _addLiquidityAndStakeWithSlippage(self, 0, neededToken0);
            return;
        }

        uint256 neededUsdc = AaveBorrowLibrary.getWithdrawAmountForBalance(
            params
        );
        uint256 neededToken0 = (neededUsdc * amount1Current) / amount0Current;
        aavePool.withdraw(address(self.usdcToken()), neededUsdc, address(self));
        aavePool.borrow(address(self.token0()), neededToken0, self.interestRateMode(), self.referralCode(), address(self));
        self.usdcToken().approve(address(self.arrakisRouter()), neededUsdc);
        self.token0().approve(address(self.arrakisRouter()), neededToken0);
        _addLiquidityAndStakeWithSlippage(self, neededUsdc, neededToken0);
    }

    function _healthFactorBalanceIGt(StrategyArrakisUsdt self) internal {
        IPool aavePool = _aavePoolEm(self);
        (uint256 collateral, uint256 borrow,,,,) = aavePool.getUserAccountData(address(self));

        (uint256 amount0Current, uint256 amount1Current) = _getUnderlyingBalances(self);

        AaveBorrowLibrary.GetSupplyAmountForBalanceParams memory params = AaveBorrowLibrary.GetSupplyAmountForBalanceParams(
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


        uint256 neededToken0 = AaveBorrowLibrary.getSupplyAmountForBalance(
            params
        );
        uint256 amountLp = _getLiquidityForToken(self, neededToken0);
        self.arrakisRewards().approve(address(self.arrakisRouter()), amountLp);

        (uint256 amount0, uint256 amount1) = _removeLiquidityAndUnstakeWithSlippage(self, amountLp);

        if (amount0 > 0) {
            self.usdcToken().approve(address(aavePool), amount0);
            aavePool.supply(address(self.usdcToken()), amount0, address(self), self.referralCode());
        }

        self.token0().approve(address(aavePool), amount1);
        aavePool.repay(address(self.token0()), amount1, self.interestRateMode(), address(self));
    }

    function _aavePoolEm(StrategyArrakisUsdt self) internal returns (IPool aavePool){
        aavePool = IPool(AaveBorrowLibrary.getAavePool(address(self.aavePoolAddressesProvider()), self.eModeCategoryId()));
    }
}
