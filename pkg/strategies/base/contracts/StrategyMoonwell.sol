// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Moonwell.sol";
import "@overnight-contracts/connectors/contracts/stuff/Balancer.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import {AerodromeLibrary} from "@overnight-contracts/connectors/contracts/stuff/Aerodrome.sol";

contract StrategyMoonwell is Strategy {

    // --- structs

    struct StrategyParams {
        address usdc;
        address well;
        address weth;
        address mUsdc;
        address unitroller;
        address aerodromeRouter;
    }

    // --- params

    IERC20 public usdc;
    IERC20 public well;
    IERC20 public weth;
    IMToken public mUsdc;
    IUnitroller public unitroller;
    address public aerodromeRouter;

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
        require(params.usdc != address(0), 'usdc is empty');
        require(params.well != address(0), 'well is empty');
        require(params.weth != address(0), 'weth is empty');
        require(params.mUsdc != address(0), 'mUsdc is empty');
        require(params.unitroller != address(0), 'unitroller is empty');
        require(params.aerodromeRouter != address(0), 'aerodromeRouter is empty');

        usdc = IERC20(params.usdc);
        well = IERC20(params.well);
        weth = IERC20(params.weth);
        mUsdc = IMToken(params.mUsdc);
        unitroller = IUnitroller(params.unitroller);
        aerodromeRouter = params.aerodromeRouter;

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
        usdc.approve(address(mUsdc), usdc.balanceOf(address(this)));
        mUsdc.mint(usdc.balanceOf(address(this)));
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        mUsdc.redeemUnderlying(_amount);
        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        mUsdc.redeem(mUsdc.balanceOf(address(this)));
        return usdc.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        return usdc.balanceOf(address(this)) + mUsdc.balanceOf(address(this)) * mUsdc.exchangeRateStored() / 1e18;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards

        uint256 totalUsdc;

        address poolWellWeth = address(0xffA3F8737C39e36dec4300B162c2153c67c8352f);
        address poolWethUsdc = address(0xcDAC0d6c6C59727a65F871236188350531885C43);

        if (mUsdc.balanceOf(address(this)) > 0) {

            uint256 balanceUsdcBefore = usdc.balanceOf(address(this));
            unitroller.claimReward();
            // Moonwell can give USDC rewards
            totalUsdc += usdc.balanceOf(address(this)) - balanceUsdcBefore;
        }

        // sell rewards

        uint256 wellBalance = well.balanceOf(address(this));
        if (wellBalance > 0) {
            uint256 usdcBalance = AerodromeLibrary.getAmountsOut(
                aerodromeRouter,
                address(well),
                address(weth),
                address(usdc),
                poolWellWeth,
                poolWethUsdc,
                wellBalance
            );
            if (usdcBalance > 0) {
                totalUsdc += AerodromeLibrary.multiSwap(
                    aerodromeRouter,
                    address(well),
                    address(weth),
                    address(usdc),
                    poolWellWeth,
                    poolWethUsdc,
                    wellBalance,
                    usdcBalance * 99 / 100,
                    address(this)
                );

            }
        }

        if (totalUsdc > 0) {
            usdc.transfer(_to, totalUsdc);
        }

        return totalUsdc;
    }

    function transferRewards() external onlyPortfolioAgent returns (uint256) {
        address rewardTokenAddress = 0xA88594D404727625A9437C3f886C7643872296AE;
        address rewardWalletAddress = 0x9030D5C596d636eEFC8f0ad7b2788AE7E9ef3D46;
        IERC20 rewardToken = IERC20(rewardTokenAddress);

        unitroller.claimReward();
        uint256 balance = rewardToken.balanceOf(address(this));
        if (balance > 0) {
            rewardToken.transfer(rewardWalletAddress, balance);
        }
        return balance;
    }
}
