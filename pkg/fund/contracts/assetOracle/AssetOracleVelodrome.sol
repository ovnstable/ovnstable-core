// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";
import "@overnight-contracts/common/contracts/libraries/WadRayMath.sol";
import {IVelodromeTwap} from "@overnight-contracts/connectors/contracts/stuff/VelodromeV2.sol";
import "../interfaces/IRebaseToken.sol";
import "./AssetOracle.sol";

import "hardhat/console.sol";

contract AssetOracleVelodrome is AssetOracle {

    address usdc;
    address ovn;
    address usdp;
    address ovnUsdPPoolAddress;
    address usdcUsdPpoolAddress;
    uint256 ovnDecimals;
    uint256 usdcDecimals;
    uint256 usdpDecimals;
    uint256 observationThreshold;

    constructor() AssetOracle() {

        usdc = 0x7F5c764cBc14f9669B88837ca1490cCa17c31607;
        ovn = 0x3b08fcd15280e7B5A6e404c4abb87F7C774D1B2e;
        usdp = 0x73cb180bf0521828d8849bc8CF2B920918e23032;
        ovnUsdPPoolAddress = 0x844D7d2fCa6786Be7De6721AabdfF6957ACE73a0;
        usdcUsdPpoolAddress = 0xd95E98fc33670dC033424E7Aa0578D742D00f9C7;
        ovnDecimals = 10**IERC20Metadata(ovn).decimals();
        usdcDecimals = 10**IERC20Metadata(usdc).decimals();
        usdpDecimals = 10**IERC20Metadata(usdp).decimals();
        observationThreshold = 240; // 5 * 24 * 2 -- count of observations for 5 days  

        assets[ovn][usdc] = true;
        assets[usdc][ovn] = true;
    }

    function _convertDuration(address assetIn, address assetOut, uint256 amountIn, uint256 duration) internal view override returns (uint256 amountOut) {
        require(assets[assetIn][assetOut], "unsupported tokens");
        if (assetIn == ovn && assetOut != ovn) {
            return _velodromeOvnToAsset(assetOut, amountIn, duration);
        } else if (assetOut == ovn && assetIn != ovn) {
            return _velodromeAssetToOvn(assetIn, amountIn, duration);
        } else {
            revert("unsupported case");
        }
    }

    function _velodromeOvnToAsset(address assetOut, uint256 amountIn, uint256 duration) internal view returns (uint256 amountOut) {
        require(assets[ovn][assetOut], "unsupported tokens");
        (uint256 ovnPerUsdP, uint256 usdPPerOvn) = getPrices(ovnUsdPPoolAddress, duration);
        console.log("ovnPerUsdP", ovnPerUsdP);
        console.log("usdPPerOvn", usdPPerOvn);
        (uint256 usdcPerUsdP, uint256 usdPPerUsdc) = getPrices(usdcUsdPpoolAddress, duration);
        console.log("usdcPerUsdP", usdcPerUsdP);
        console.log("usdPPerUsdc", usdPPerUsdc);
        amountOut = amountIn * usdPPerOvn / ovnDecimals * usdcPerUsdP / usdpDecimals;
        console.log("amountOut", amountOut);
    }
   
    function _velodromeAssetToOvn(address assetIn, uint256 amountIn, uint256 duration) internal view returns (uint256 amountOut) {
        require(assets[assetIn][ovn], "unsupported tokens");
        require(_poolHasLiquidity(ovnUsdPPoolAddress), "OVN/USD+ pool doesn't have liquidity");
        require(_poolHasLiquidity(ovnUsdPPoolAddress), "USDC/USD+ pool doesn't have liquidity");
        (uint256 ovnPerUsdP, uint256 usdPPerOvn) = getPrices(ovnUsdPPoolAddress, duration);
        console.log("ovnPerUsdP", ovnPerUsdP);
        console.log("usdPPerOvn", usdPPerOvn);
        (uint256 usdcPerUsdP, uint256 usdPPerUsdc) = getPrices(usdcUsdPpoolAddress, duration);
        console.log("usdcPerUsdP", usdcPerUsdP);
        console.log("usdPPerUsdc", usdPPerUsdc);
        amountOut = amountIn * usdPPerUsdc / usdcDecimals * ovnPerUsdP / usdpDecimals;
        console.log("amountOut", amountOut);
    }

    function _poolHasLiquidity(address poolAddress) internal view returns (bool) {
        IVelodromeTwap velodromeTwap = IVelodromeTwap(poolAddress);
        (uint256 reserve0, uint256 reserve1,) = velodromeTwap.getReserves();
        // todo add logic
        return true;
    }
   
    function _calculateIndexes(address poolAddress, uint256 duration) private view returns (IVelodromeTwap.Observation memory firstObservation) {
        IVelodromeTwap velodromeTwap = IVelodromeTwap(poolAddress);
        uint256 r = velodromeTwap.observationLength();
        uint256 l = (r >= observationThreshold) ? r - observationThreshold : 0;
        uint256 lastTimestamp = velodromeTwap.blockTimestampLast();

        if (r <= 1) {
            revert("not enough quantity of observations");
        }

        while (true) {
            uint256 m = (l + r) / 2;
            uint256 timestamp = lastTimestamp - velodromeTwap.observations(m).timestamp;

            if (timestamp > duration) {
                l = m;
            } else {
                r = m;
            }

            if (r - l <= 1) {
                break;
            }
        }

        uint256 timestamp0 = lastTimestamp - velodromeTwap.observations(l).timestamp;
        uint256 timestamp1 = lastTimestamp - velodromeTwap.observations(r).timestamp;

        if (timestamp1 > duration) {
            return velodromeTwap.observations(r);
        } else if (timestamp0 > duration) {
            return velodromeTwap.observations(l);
        } else {
            revert("too young observations");
        }
    }

    function getPrices(address poolAddress, uint256 duration) public view returns (uint256, uint256) {
        IVelodromeTwap velodromeTwap = IVelodromeTwap(poolAddress);
        uint256 token0Decimals = 10**IERC20Metadata(velodromeTwap.token0()).decimals();
        uint256 token1Decimals = 10**IERC20Metadata(velodromeTwap.token1()).decimals();
        uint256 reserve0;
        uint256 reserve1;
        {
        IVelodromeTwap.Observation memory firstObservation =  _calculateIndexes(poolAddress, duration);

        uint256 timeElapsed = velodromeTwap.blockTimestampLast() - firstObservation.timestamp;
        reserve0 = (velodromeTwap.reserve0CumulativeLast() - firstObservation.reserve0Cumulative) / timeElapsed;
        reserve1 = (velodromeTwap.reserve1CumulativeLast() - firstObservation.reserve1Cumulative) / timeElapsed;
        }

        bool stable = velodromeTwap.stable();

        uint256 price0 = _getAmountOut(reserve0, reserve1, token0Decimals, token1Decimals, stable);
        uint256 price1 = _getAmountOut(reserve1, reserve0, token1Decimals, token0Decimals, stable);

        // console.log("price0", price0);
        // console.log("price1", price1);

        return (price0, price1);
    }

    function _getAmountOut(uint256 reserve0, uint256 reserve1, uint256 decimals0, uint256 decimals1, bool stable) internal view returns (uint256) {
        if (stable) {
            uint xy = _k(reserve0, reserve1);
            reserve0 = reserve0 * 1e18 / decimals0;
            reserve1 = reserve1 * 1e18 / decimals1;
            uint y = reserve0 - _get_y(1e18 + reserve1, xy, reserve0);
            return y * decimals0 / 1e18;
        } else {
            return decimals1 * reserve0 / reserve1;
        }
    }

    function _k(uint256 x, uint256 y) internal view returns (uint256) {
        uint256 _x = (x * 1e18) / 1e6;
        uint256 _y = (y * 1e18) / 1e6;
        uint256 _a = (_x * _y) / 1e18;
        uint256 _b = ((_x * _x) / 1e18 + (_y * _y) / 1e18);
        return (_a * _b) / 1e18; // x3y+y3x >= k
    }

    function _get_y(uint256 x0, uint256 xy, uint256 y) internal view returns (uint256) {
        for (uint256 i = 0; i < 255; i++) {
            uint256 k = _f(x0, y);
            if (k < xy) {
                // there are two cases where dy == 0
                // case 1: The y is converged and we find the correct answer
                // case 2: _d(x0, y) is too large compare to (xy - k) and the rounding error
                //         screwed us.
                //         In this case, we need to increase y by 1
                uint256 dy = ((xy - k) * 1e18) / _d(x0, y);
                if (dy == 0) {
                    if (k == xy) {
                        // We found the correct answer. Return y
                        return y;
                    }
                    if (_k(x0, y + 1) > xy) {
                        // If _k(x0, y + 1) > xy, then we are close to the correct answer.
                        // There's no closer answer than y + 1
                        return y + 1;
                    }
                    dy = 1;
                }
                y = y + dy;
            } else {
                uint256 dy = ((k - xy) * 1e18) / _d(x0, y);
                if (dy == 0) {
                    if (k == xy || _f(x0, y - 1) < xy) {
                        // Likewise, if k == xy, we found the correct answer.
                        // If _f(x0, y - 1) < xy, then we are close to the correct answer.
                        // There's no closer answer than "y"
                        // It's worth mentioning that we need to find y where f(x0, y) >= xy
                        // As a result, we can't return y - 1 even it's closer to the correct answer
                        return y;
                    }
                    dy = 1;
                }
                y = y - dy;
            }
        }
        revert("!y");
    }

    function _f(uint256 x0, uint256 y) internal pure returns (uint256) {
        uint256 _a = (x0 * y) / 1e18;
        uint256 _b = ((x0 * x0) / 1e18 + (y * y) / 1e18);
        return (_a * _b) / 1e18;
    }

    function _d(uint256 x0, uint256 y) internal pure returns (uint256) {
        return (3 * x0 * ((y * y) / 1e18)) / 1e18 + ((((x0 * x0) / 1e18) * x0) / 1e18);
    }


}
