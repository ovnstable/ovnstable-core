// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Sonne.sol";
import {AerodromeLibrary} from "@overnight-contracts/connectors/contracts/stuff/Aerodrome.sol";

contract StrategySonneUsdbc is Strategy {

    // --- structs

    struct StrategyParams {
        address usdbc;
        address sonne;
        address cUsdbc;
        address unitroller;
        address aerodromeRouter;
        address poolSonneUsdbc;
    }

    // --- params

    IERC20 public usdbc;
    IERC20 public sonne;
    CToken public cUsdbc;
    Unitroller public unitroller;
    address public aerodromeRouter;
    address public poolSonneUsdbc;

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
        require(params.usdbc != address(0), 'usdbc is empty');
        require(params.sonne != address(0), 'sonne is empty');
        require(params.cUsdbc != address(0), 'cUsdbc is empty');
        require(params.unitroller != address(0), 'unitroller is empty');
        require(params.aerodromeRouter != address(0), 'aerodromeRouter is empty');
        require(params.poolSonneUsdbc != address(0), 'poolSonneUsdbc is empty');

        usdbc = IERC20(params.usdbc);
        sonne = IERC20(params.sonne);
        cUsdbc = CToken(params.cUsdbc);
        unitroller = Unitroller(params.unitroller);
        aerodromeRouter = params.aerodromeRouter;
        poolSonneUsdbc = params.poolSonneUsdbc;

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
        uint256 usdbcBalance = usdbc.balanceOf(address(this));
        usdbc.approve(address(cUsdbc), usdbcBalance);
        cUsdbc.mint(usdbcBalance);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        cUsdbc.redeemUnderlying(_amount);
        return usdbc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        cUsdbc.redeem(cUsdbc.balanceOf(address(this)));
        return usdbc.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        return usdbc.balanceOf(address(this)) + cUsdbc.balanceOf(address(this)) * cUsdbc.exchangeRateStored() / 1e18;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        if (cUsdbc.balanceOf(address(this)) > 0) {
            CToken[] memory cTokens = new CToken[](1);
            cTokens[0] = cUsdbc;
            unitroller.claimComp(address(this), cTokens);
        }

        // sell rewards
        uint256 totalUsdbc;

        uint256 sonneBalance = sonne.balanceOf(address(this));
        if (sonneBalance > 0) {
            uint256 sonneSellAmount = AerodromeLibrary.getAmountsOut(
                aerodromeRouter,
                address(sonne),
                address(usdbc),
                poolSonneUsdbc,
                sonneBalance
            );
            if (sonneSellAmount > 0) {
                totalUsdbc += AerodromeLibrary.singleSwap(
                    aerodromeRouter,
                    address(sonne),
                    address(usdbc),
                    poolSonneUsdbc,
                    sonneBalance,
                    sonneSellAmount * 99 / 100,
                    address(this)
                );
            }
        }

        if (totalUsdbc > 0) {
            usdbc.transfer(_to, totalUsdbc);
        }

        return totalUsdbc;
    }

}
