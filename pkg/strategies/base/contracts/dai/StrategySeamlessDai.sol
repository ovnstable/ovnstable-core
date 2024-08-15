// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/AaveV3.sol";
import {AerodromeLibrary} from "@overnight-contracts/connectors/contracts/stuff/Aerodrome.sol";

contract StrategySeamlessDai is Strategy {

    IERC20 public dai;
    IERC20 public usdbc;
    IERC20 public sDai;

    IPoolAddressesProvider public provider;

    IRewardsController public rewardsController;

    IERC20 public seam;

    address public aerodromeRouter;
    address public poolSeamUsdbc;
    address public poolUsdbcDai;


    // --- events
    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address dai;
        address usdbc;
        address sDai;
        address provider;
        address rewardsController;
        address seam;
        address aerodromeRouter;
        address poolSeamUsdbc;
        address poolUsdbcDai;
    }


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        dai = IERC20(params.dai);
        usdbc = IERC20(params.usdbc);
        sDai = IERC20(params.sDai);
        provider = IPoolAddressesProvider(params.provider);
        rewardsController = IRewardsController(params.rewardsController);
        seam = IERC20(params.seam);
        aerodromeRouter = params.aerodromeRouter;
        poolSeamUsdbc = params.poolSeamUsdbc;
        poolUsdbcDai = params.poolUsdbcDai;

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
        IPool pool = IPool(provider.getPool());
        dai.approve(address(pool), _amount);
        pool.deposit(address(dai), _amount, address(this), 0);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        IPool pool = IPool(provider.getPool());
        sDai.approve(address(pool), _amount);
        uint256 withdrawAmount = pool.withdraw(_asset, _amount, address(this));

        return withdrawAmount;
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        uint256 _amount = sDai.balanceOf(address(this));

        IPool pool = IPool(provider.getPool());
        sDai.approve(address(pool), _amount);
        uint256 withdrawAmount = pool.withdraw(_asset, _amount, address(this));

        return withdrawAmount;
    }

    function netAssetValue() external view override returns (uint256) {
        return dai.balanceOf(address(this)) + sDai.balanceOf(address(this));
    }

    function liquidationValue() external view override returns (uint256) {
        return dai.balanceOf(address(this)) + sDai.balanceOf(address(this));
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {

        // claim rewards
        uint256 sDaiBalance = sDai.balanceOf(address(this));
        if (sDaiBalance == 0) {
            return 0;
        }

        address[] memory assets = new address[](1);
        assets[0] = address(sDai);
        (address[] memory rewardsList, uint256[] memory claimedAmounts) = rewardsController.claimAllRewardsToSelf(assets);

        // sell rewards
        uint256 totalDai;

        uint256 seamBalance = seam.balanceOf(address(this));
        if (seamBalance > 0) {

            uint256 seamSellAmount = AerodromeLibrary.getAmountsOut(
                aerodromeRouter,
                address(seam),
                address(usdbc),
                poolSeamUsdbc,
                seamBalance
            );
            if (seamSellAmount > 0) {
                totalDai += AerodromeLibrary.multiSwap(
                    aerodromeRouter,
                    address(seam),
                    address(usdbc),
                    address(dai),
                    poolSeamUsdbc,
                    poolUsdbcDai,
                    seamBalance,
                    seamSellAmount * 1e12 * 99 / 100,
                    address(this)
                );
            }
        }

        if (totalDai > 0) {
            dai.transfer(_beneficiary, totalDai);
        }

        return totalDai;
    }

}
