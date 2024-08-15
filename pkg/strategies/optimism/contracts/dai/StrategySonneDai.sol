// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Sonne.sol";
import {VelodromeLibrary} from "@overnight-contracts/connectors/contracts/stuff/VelodromeV2.sol";

contract StrategySonneDai is Strategy {

    // --- structs

    struct StrategyParams {
        address dai;
        address usdc;
        address sonne;
        address cDai;
        address unitroller;
        address velodromeRouter;
        address poolSonneUsdc;
        address poolUsdcDai;
    }

    // --- params

    IERC20 public dai;
    IERC20 public usdc;
    IERC20 public sonne;
    CToken public cDai;
    Unitroller public unitroller;
    address public velodromeRouter;
    address public poolSonneUsdc;
    address public poolUsdcDai;

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
        dai = IERC20(params.dai);
        usdc = IERC20(params.usdc);
        sonne = IERC20(params.sonne);
        cDai = CToken(params.cDai);
        unitroller = Unitroller(params.unitroller);
        velodromeRouter = params.velodromeRouter;
        poolSonneUsdc = params.poolSonneUsdc;
        poolUsdcDai = params.poolUsdcDai;

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
        uint256 daiBalance = dai.balanceOf(address(this));
        dai.approve(address(cDai), daiBalance);
        cDai.mint(daiBalance);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        cDai.redeemUnderlying(_amount);
        return dai.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        cDai.redeem(cDai.balanceOf(address(this)));
        return dai.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        return dai.balanceOf(address(this)) + cDai.balanceOf(address(this)) * cDai.exchangeRateStored() / 1e18;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        if (cDai.balanceOf(address(this)) > 0) {
            CToken[] memory cTokens = new CToken[](1);
            cTokens[0] = cDai;
            unitroller.claimComp(address(this), cTokens);
        }

        // sell rewards
        uint256 totalDai;

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
                totalDai += VelodromeLibrary.multiSwap(
                    velodromeRouter,
                    address(sonne),
                    address(usdc),
                    address(dai),
                    false,
                    true,
                    poolSonneUsdc,
                    poolUsdcDai,
                    sonneBalance,
                    sonneSellAmount * 1e12 * 99 / 100,
                    address(this)
                );
            }
        }

        if (totalDai > 0) {
            dai.transfer(_to, totalDai);
        }

        return totalDai;
    }

}
