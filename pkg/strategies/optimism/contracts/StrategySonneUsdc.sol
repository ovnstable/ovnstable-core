// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Sonne.sol";
import {VelodromeLibrary} from "@overnight-contracts/connectors/contracts/stuff/VelodromeV2.sol";

contract StrategySonneUsdc is Strategy {

    // --- structs

    struct StrategyParams {
        address usdc;
        address sonne;
        address cUsdc;
        address unitroller;
        address velodromeRouter;
        address poolSonneUsdc;
    }

    // --- params

    IERC20 public usdc;
    IERC20 public sonne;
    CToken public cUsdc;
    Unitroller public unitroller;
    address public velodromeRouter;
    address public poolSonneUsdc;

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
        sonne = IERC20(params.sonne);
        cUsdc = CToken(params.cUsdc);
        unitroller = Unitroller(params.unitroller);
        velodromeRouter = params.velodromeRouter;
        poolSonneUsdc = params.poolSonneUsdc;

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
        uint256 usdcBalance = usdc.balanceOf(address(this));
        usdc.approve(address(cUsdc), usdcBalance);
        cUsdc.mint(usdcBalance);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        cUsdc.redeemUnderlying(_amount);
        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        cUsdc.redeem(cUsdc.balanceOf(address(this)));
        return usdc.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        return usdc.balanceOf(address(this)) + cUsdc.balanceOf(address(this)) * cUsdc.exchangeRateStored() / 1e18;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        if (cUsdc.balanceOf(address(this)) > 0) {
            CToken[] memory cTokens = new CToken[](1);
            cTokens[0] = cUsdc;
            unitroller.claimComp(address(this), cTokens);
        }

        // sell rewards
        uint256 totalUsdc;

        uint256 sonneBalance = sonne.balanceOf(address(this));
        if (sonneBalance > 0) {
            uint256 sonneSellAmount = VelodromeLibrary.getAmountsOut(
                velodromeRouter,
                address(sonne),
                address(usdc),
                false,
                poolSonneUsdc,
                sonneBalance
            );
            if (sonneSellAmount > 0) {
                totalUsdc += VelodromeLibrary.singleSwap(
                    velodromeRouter,
                    address(sonne),
                    address(usdc),
                    false,
                    poolSonneUsdc,
                    sonneBalance,
                    sonneSellAmount * 99 / 100,
                    address(this)
                );
            }
        }

        if (totalUsdc > 0) {
            usdc.transfer(_to, totalUsdc);
        }

        return totalUsdc;
    }

}
