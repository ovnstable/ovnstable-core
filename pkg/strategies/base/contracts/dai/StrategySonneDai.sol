// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Sonne.sol";
import {AerodromeLibrary} from "@overnight-contracts/connectors/contracts/stuff/Aerodrome.sol";

contract StrategySonneDai is Strategy {

    // --- structs

    struct StrategyParams {
        address dai;
        address usdbc;
        address sonne;
        address cDai;
        address unitroller;
        address aerodromeRouter;
        address poolSonneUsdbc;
        address poolUsdbcDai;
    }

    // --- params

    IERC20 public dai;
    IERC20 public usdbc;
    IERC20 public sonne;
    CToken public cDai;
    Unitroller public unitroller;
    address public aerodromeRouter;
    address public poolSonneUsdbc;
    address public poolUsdbcDai;

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
        require(params.dai != address(0), 'dai is empty');
        require(params.usdbc != address(0), 'usdbc is empty');
        require(params.sonne != address(0), 'sonne is empty');
        require(params.cDai != address(0), 'cDai is empty');
        require(params.unitroller != address(0), 'unitroller is empty');
        require(params.aerodromeRouter != address(0), 'aerodromeRouter is empty');
        require(params.poolSonneUsdbc != address(0), 'poolSonneUsdbc is empty');
        require(params.poolUsdbcDai != address(0), 'poolUsdbcDai is empty');

        dai = IERC20(params.dai);
        usdbc = IERC20(params.usdbc);
        sonne = IERC20(params.sonne);
        cDai = CToken(params.cDai);
        unitroller = Unitroller(params.unitroller);
        aerodromeRouter = params.aerodromeRouter;
        poolSonneUsdbc = params.poolSonneUsdbc;
        poolUsdbcDai = params.poolUsdbcDai;

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
            uint256 sonneSellAmount = AerodromeLibrary.getAmountsOut(
                aerodromeRouter,
                address(sonne),
                address(usdbc),
                poolSonneUsdbc,
                sonneBalance
            );
            if (sonneSellAmount > 0) {
                totalDai += AerodromeLibrary.multiSwap(
                    aerodromeRouter,
                    address(sonne),
                    address(usdbc),
                    address(dai),
                    poolSonneUsdbc,
                    poolUsdbcDai,
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
