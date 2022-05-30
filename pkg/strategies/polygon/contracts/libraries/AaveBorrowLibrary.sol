// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../connectors/aave/interfaces/IPoolAddressesProvider.sol";
import "../connectors/aave/interfaces/IPriceFeed.sol";
import "../connectors/aave/interfaces/IPool.sol";


library AaveBorrowLibrary {

    function getAavePool(
        address aavePoolAddressesProvider,
        uint8 eModeCategoryId
    ) internal returns (address aavePool) {
        aavePool = IPoolAddressesProvider(aavePoolAddressesProvider).getPool();
        IPool(aavePool).setUserEMode(eModeCategoryId);
    }

    function getCollateralAndBorrowForSupplyAndBorrow(
        uint256 amount0,
        uint256 reserve0,
        uint256 reserve1,
        uint256 LT,
        uint256 HF,
        uint256 token0Denominator,
        uint256 token1Denominator,
        uint256 price0,
        uint256 price1
    ) internal view returns (uint256 collateral0, uint256 borrow1) {
        uint256 reserve1InToken0 = convertTokenAmountToTokenAmount(reserve1, token1Denominator, token0Denominator, price1, price0);
        collateral0 = amount0 * HF / (HF + LT * reserve0 / reserve1InToken0);
        uint256 collateral1 = convertTokenAmountToTokenAmount(collateral0, token0Denominator, token1Denominator, price0, price1);
        borrow1 = collateral1 * LT / HF;
    }

    function getBorrowForWithdraw(
        uint256 collateral0,
        uint256 totalCollateralUsd,
        uint256 totalBorrowUsd,
        uint256 reserve0,
        uint256 reserve1,
        uint256 LT,
        uint256 HF,
        uint256 token0Denominator,
        uint256 token1Denominator,
        uint256 price0,
        uint256 price1
    ) internal view returns (uint256 borrow1) {
        uint256 totalBorrowUsd1 = convertUsdToTokenAmount(totalBorrowUsd, token1Denominator, price1);
        uint256 totalCollateralUsd1 = convertUsdToTokenAmount(totalCollateralUsd, token1Denominator, price1);
        uint256 collateral1 = convertTokenAmountToTokenAmount(collateral0, token0Denominator, token1Denominator, price0, price1);
        uint256 reserve1InToken0 = convertTokenAmountToTokenAmount(reserve1, token1Denominator, token0Denominator, price1, price0);
        borrow1 = (totalBorrowUsd1 * HF - (totalCollateralUsd1 - collateral1) * LT) / (HF + LT * reserve0 / reserve1InToken0);
    }

    function getLpTokensForWithdraw(
        uint256 totalLpBalance,
        uint256 borrow1,
        uint256 reserve0,
        uint256 reserve1,
        uint256 token0Denominator,
        uint256 token1Denominator,
        uint256 price0,
        uint256 price1
    ) internal view returns (uint256 lpTokensToWithdraw) {
        uint256 borrow0 = convertTokenAmountToTokenAmount(borrow1, token1Denominator, token0Denominator, price1, price0);
        uint256 reserve1InToken0 = convertTokenAmountToTokenAmount(reserve1, token1Denominator, token0Denominator, price1, price0);
        lpTokensToWithdraw = totalLpBalance * (borrow0 + borrow1 * reserve0 / reserve1) / (reserve0 + reserve1InToken0);
    }

    function getWithdrawAmountForBalance(
        uint256 totalCollateralUsd,
        uint256 totalBorrowUsd,
        uint256 reserve0,
        uint256 reserve1,
        uint256 LT,
        uint256 HF,
        uint256 token0Denominator,
        uint256 token1Denominator,
        uint256 price0,
        uint256 price1
    ) internal view returns (uint256 withdrawAmount) {
        uint256 reserve1InUsd = convertTokenAmountToUsd(reserve1, token1Denominator, price1);
        uint256 reserve0InUsd = convertTokenAmountToUsd(reserve0, token0Denominator, price0);
        withdrawAmount = reserve0 * (totalCollateralUsd * LT - totalBorrowUsd * HF) / (reserve1InUsd * HF + reserve0InUsd * LT);
    }

    function getSupplyAmountForBalance(
        uint256 totalCollateralUsd,
        uint256 totalBorrowUsd,
        uint256 reserve0,
        uint256 reserve1,
        uint256 LT,
        uint256 HF,
        uint256 token0Denominator,
        uint256 token1Denominator,
        uint256 price0,
        uint256 price1
    ) internal view returns (uint256 supplyAmount) {
        uint256 reserve1InUsd = convertTokenAmountToUsd(reserve1, token1Denominator, price1);
        uint256 reserve0InUsd = convertTokenAmountToUsd(reserve0, token0Denominator, price0);
        supplyAmount = reserve1 * (totalBorrowUsd * HF - totalCollateralUsd * LT) / (reserve1InUsd * HF + reserve0InUsd * LT);
    }

    function convertTokenAmountToTokenAmount(
        uint256 amount0,
        uint256 token0Denominator,
        uint256 token1Denominator,
        uint256 price0,
        uint256 price1
    ) internal view returns (uint256 amount1) {
        amount1 = (amount0 * token1Denominator * price0) / (token0Denominator * price1);
    }

    function convertTokenAmountToUsd(
        uint256 amount,
        uint256 tokenDenominator,
        uint256 price
    ) internal view returns (uint256 amountUsd) {
        amountUsd = amount * price / tokenDenominator;
    }

    function convertUsdToTokenAmount(
        uint256 amountUsd,
        uint256 tokenDenominator,
        uint256 price
    ) internal view returns (uint256 amount) {
        amount = amountUsd * tokenDenominator / price;
    }

}
