// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";
import "@overnight-contracts/common/contracts/libraries/WadRayMath.sol";
import "./interfaces/IPortfolioManager.sol";
import "./interfaces/IMark2Market.sol";
import "./interfaces/IOvnOracle.sol";
import "./interfaces/IVelodromeTwap.sol";

import "./interfaces/IRebaseToken.sol";

import "hardhat/console.sol";

contract OvnOracle is IOvnOracle, Initializable, AccessControlUpgradeable, UUPSUpgradeable, PausableUpgradeable {

    IERC20 public ovn;
    uint256 twapDurationSec;

    struct SetUpParams {
        address ovn;
    }

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public  {
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        twapDurationSec = 10800; // 3 hours
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyAdmin
    override
    {}

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    function setUpParams(SetUpParams calldata params) external onlyAdmin {
        ovn = IERC20(params.ovn);
    }

    function setTwapDurationSec(uint256 _twapDurationSec) external onlyAdmin {
        twapDurationSec = _twapDurationSec;
    }

    function ovnToAsset(uint256 amount, address asset) public returns (uint256 rate) {
        return _velodromeOvnToAsset(amount, asset, twapDurationSec);
    }

    function assetToOvn(uint256 amount, address asset) public returns (uint256 rate) {
        return _velodromeAssetToOvn(amount, asset, twapDurationSec);
    }

    function ovnToAssetDuration(uint256 amount, address asset, uint256 duration) public returns (uint256 rate) {
        return _velodromeOvnToAsset(amount, asset, duration);
    }

    function assetToOvnDuration(uint256 amount, address asset, uint256 duration) public returns (uint256 rate) {
        return _velodromeAssetToOvn(amount, asset, duration);
    }

    function _velodromeOvnToAsset(uint256 amount, address asset, uint256 duration) internal returns (uint256 rate) {
        address usdc = 0x7F5c764cBc14f9669B88837ca1490cCa17c31607;
        address ovnUsdPPoolAddress = 0x844D7d2fCa6786Be7De6721AabdfF6957ACE73a0;
        address usdcUsdPpoolAddress = 0xd95E98fc33670dC033424E7Aa0578D742D00f9C7;
        require(asset == usdc, "inappropriate token");
        (uint256 ovnPerUsdP, uint256 usdPPerOvn) = getPrices(ovnUsdPPoolAddress, duration);
        (uint256 usdcPerUsdP, uint256 usdPPerUsdc) = getPrices(usdcUsdPpoolAddress, duration);
        rate = amount * usdPPerOvn / usdcPerUsdP;
        console.log("rate", rate);
    }
   
    function _velodromeAssetToOvn(uint256 amount, address asset, uint256 duration) internal returns (uint256 rate) {
        address usdc = 0x7F5c764cBc14f9669B88837ca1490cCa17c31607;
        address ovnUsdPPoolAddress = 0x844D7d2fCa6786Be7De6721AabdfF6957ACE73a0;
        address usdcUsdPpoolAddress = 0xd95E98fc33670dC033424E7Aa0578D742D00f9C7;
        require(asset == usdc, "inappropriate token");
        (uint256 ovnPerUsdP, uint256 usdPPerOvn) = getPrices(ovnUsdPPoolAddress, duration);
        (uint256 usdcPerUsdP, uint256 usdPPerUsdc) = getPrices(usdcUsdPpoolAddress, duration);
        rate = amount * usdPPerUsdc * usdPPerOvn;
        console.log("rate", rate);
    }
   
    function getPrices(address poolAddress, uint256 duration) public view returns (uint256, uint256) {
        IVelodromeTwap velodromeTwap = IVelodromeTwap(poolAddress);
        uint256 token0Decimals = 10**IERC20Metadata(velodromeTwap.token0()).decimals();
        uint256 token1Decimals = 10**IERC20Metadata(velodromeTwap.token1()).decimals();
        uint256 reserve0;
        uint256 reserve1;
        {
        uint256 lastIndex = velodromeTwap.observationLength() - 1;
        uint256 firstIndex = lastIndex - 1;

        IVelodromeTwap.Observation memory lastObservation = velodromeTwap.observations(lastIndex);
        IVelodromeTwap.Observation memory firstObservation = velodromeTwap.observations(firstIndex);

        uint256 timeElapsed = lastObservation.timestamp - firstObservation.timestamp;
        reserve0 = (lastObservation.reserve0Cumulative - firstObservation.reserve0Cumulative) / timeElapsed;
        reserve1 = (lastObservation.reserve1Cumulative - firstObservation.reserve1Cumulative) / timeElapsed;
        }

        bool stable = velodromeTwap.stable();

        uint256 price0 = _getAmountOut(reserve0, reserve1, token0Decimals, token1Decimals, stable);
        uint256 price1 = _getAmountOut(reserve1, reserve0, token1Decimals, token0Decimals, stable);

        console.log("price0", price0);
        console.log("price1", price1);

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
