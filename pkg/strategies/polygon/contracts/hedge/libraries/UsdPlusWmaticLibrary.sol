pragma solidity ^0.8.0;

import "../StrategyUsdPlusWmatic.sol";
import "../../libraries/AaveBorrowLibrary.sol";
import "../../connectors/dystopia/interfaces/IDystopiaLP.sol";
import {OvnMath} from "../../libraries/OvnMath.sol";

import "hardhat/console.sol";

library UsdPlusWmaticLibrary {


    function _healthFactorBalanceILt(StrategyUsdPlusWmatic self) public  {
        IPool aave = _aavePool(self);

        (uint256 collateral, uint256 borrow,,,,) = aave.getUserAccountData(address(this));
        (uint256 reserveWmatic, uint256 reserveUsdPlus, ) =  self.dystVault().getReserves();

        AaveBorrowLibrary.GetWithdrawAmountForBalanceParams memory params = AaveBorrowLibrary.GetWithdrawAmountForBalanceParams(
            collateral,
            borrow,
            reserveUsdPlus,
            reserveWmatic,
            self.liquidationThreshold(),
            self.healthFactor(),
            self.usdcDm(),
            self.wmaticDm(),
            uint256(self.oracleUsdc().latestAnswer()),
            uint256(self.oracleWmatic().latestAnswer())
        );

        uint256 neededUsdc = AaveBorrowLibrary.getWithdrawAmountForBalance(
            params
        );


        aave.withdraw(address(self.usdc()), neededUsdc, address(self));

        (params.totalCollateralUsd, params.totalBorrowUsd,,,,) = aave.getUserAccountData(address(self));

        uint256 wmaticAmount = AaveBorrowLibrary.getBorrowIfZeroAmountForBalance(params);
        aave.borrow(address(self.wmatic()), wmaticAmount, self.INTEREST_RATE_MODE(), self.REFERRAL_CODE(), address(self));

        self.usdc().approve(address(self.exchange()), neededUsdc);
        self.exchange().buy(address(self.usdc()), neededUsdc);

        uint256 usdPlusAmount = self.usdPlus().balanceOf(address(self));

        _addLiquidity(self, wmaticAmount, usdPlusAmount);
    }

    function _addLiquidity(StrategyUsdPlusWmatic self, uint256 wmaticAmount , uint256 usdPlusAmount) internal {

        self.usdPlus().approve(address(self.dystRouter()), usdPlusAmount);
        self.wmatic().approve(address(self.dystRouter()), wmaticAmount);

        self.dystRouter().addLiquidity(
            address(self.wmatic()),
            address(self.usdPlus()),
            false,
            wmaticAmount,
            usdPlusAmount,
            0,
            0,
            address(self),
            block.timestamp + 600
        );


        uint256 lpTokenBalance = self.dystVault().balanceOf(address(self));
        self.dystVault().approve(address(self.penProxy()), lpTokenBalance);
        self.penProxy().depositLpAndStake(address(self.dystVault()), lpTokenBalance);
    }

    function _aavePool(StrategyUsdPlusWmatic self) public returns (IPool aavePool){
        aavePool = IPool(AaveBorrowLibrary.getAavePool(address(self.aavePoolAddressesProvider()), self.E_MODE_CATEGORY_ID()));
    }


    function _removeLiquidity(StrategyUsdPlusWmatic self, uint256 amountLp) internal returns (uint256 amountWmatic, uint256 amountUsdPlus) {

        (uint256 amountLiq0, uint256 amountLiq1) = self._getLiquidity( amountLp);
        (amountWmatic, amountUsdPlus) = self.dystRouter().removeLiquidity(
            address(self.wmatic()),
            address(self.usdPlus()),
            false,
            amountLp,
            (amountLiq0 == 0) ? 0 : OvnMath.subBasisPoints(amountLiq0, self.BASIS_POINTS_FOR_SLIPPAGE()),
            (amountLiq1 == 0) ? 0 : OvnMath.subBasisPoints(amountLiq1, self.BASIS_POINTS_FOR_SLIPPAGE()),
            address(self),
            block.timestamp + 600
        );

    }


    function _healthFactorBalanceIGt(StrategyUsdPlusWmatic self) public {
        IPool aave = _aavePool(self);
        (uint256 collateral, uint256 borrow,,,,) = aave.getUserAccountData(address(self));
        (uint256 reserveWmatic, uint256 reserveUsdPlus, ) =  self.dystVault().getReserves();

        AaveBorrowLibrary.GetLpTokensForBalanceParams memory params = AaveBorrowLibrary.GetLpTokensForBalanceParams(
            collateral,
            borrow,
            reserveUsdPlus,
            reserveWmatic,
            self.liquidationThreshold(),
            self.healthFactor(),
            self.usdcDm(),
            self.wmaticDm(),
            uint256(self.oracleUsdc().latestAnswer()),
            uint256(self.oracleWmatic().latestAnswer()),
            self.dystVault().totalSupply()
        );

        uint256 amountLp = AaveBorrowLibrary.getLpTokensForBalance(params);
        self.penProxy().unstakeLpAndWithdraw(address(self.dystVault()), amountLp);
        self.dystVault().approve(address(self.dystRouter()), amountLp);
        (uint256 amountWmatic, uint256 amountUsdPlus) = _removeLiquidity(self,amountLp);

        self.usdPlus().approve(address(self.exchange()), amountUsdPlus);
        self.exchange().redeem(address(self.usdc()), amountUsdPlus);

        uint256 amountUsdc = self.usdc().balanceOf(address(self));
        self.usdc().approve(address(aave), amountUsdc);
        aave.supply(address(self.usdc()), amountUsdc, address(self), self.REFERRAL_CODE());

        self.wmatic().approve(address(aave), amountWmatic);
        aave.repay(address(self.wmatic()), amountWmatic, self.INTEREST_RATE_MODE(), address(self));
    }
}
