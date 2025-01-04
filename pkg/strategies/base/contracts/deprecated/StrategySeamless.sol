// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/AaveV3.sol";
import {AerodromeLibrary} from "@overnight-contracts/connectors/contracts/stuff/Aerodrome.sol";

contract StrategySeamless is Strategy {

    IERC20 public usdbc;
    IERC20 public sUsdbc;

    IPoolAddressesProvider public provider;

    IRewardsController public rewardsController;

    IERC20 public seam;

    address public aerodromeRouter;
    address public poolSeamUsdbc;


    // --- events
    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address usdbc;
        address sUsdbc;
        address provider;
        address rewardsController;
        address seam;
        address aerodromeRouter;
        address poolSeamUsdbc;
    }


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        usdbc = IERC20(params.usdbc);
        sUsdbc = IERC20(params.sUsdbc);
        provider = IPoolAddressesProvider(params.provider);
        rewardsController = IRewardsController(params.rewardsController);
        seam = IERC20(params.seam);
        aerodromeRouter = params.aerodromeRouter;
        poolSeamUsdbc = params.poolSeamUsdbc;

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(usdbc), "Some token not compatible");

        IPool pool = IPool(provider.getPool());
        usdbc.approve(address(pool), _amount);
        pool.deposit(address(usdbc), _amount, address(this), 0);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdbc), "Some token not compatible");

        IPool pool = IPool(provider.getPool());
        sUsdbc.approve(address(pool), _amount);
        uint256 withdrawAmount = pool.withdraw(_asset, _amount, address(this));

        return withdrawAmount;
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdbc), "Some token not compatible");

        uint256 _amount = sUsdbc.balanceOf(address(this));

        IPool pool = IPool(provider.getPool());
        sUsdbc.approve(address(pool), _amount);
        uint256 withdrawAmount = pool.withdraw(_asset, _amount, address(this));

        return withdrawAmount;
    }

    function netAssetValue() external view override returns (uint256) {
        return usdbc.balanceOf(address(this)) + sUsdbc.balanceOf(address(this));
    }

    function liquidationValue() external view override returns (uint256) {
        return usdbc.balanceOf(address(this)) + sUsdbc.balanceOf(address(this));
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {

        // claim rewards
        uint256 sUsdcBalance = sUsdbc.balanceOf(address(this));
        if (sUsdcBalance == 0) {
            return 0;
        }

        address[] memory assets = new address[](1);
        assets[0] = address(sUsdbc);
        (address[] memory rewardsList, uint256[] memory claimedAmounts) = rewardsController.claimAllRewardsToSelf(assets);

        // sell rewards
        uint256 totalUsdbc;

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
                totalUsdbc += AerodromeLibrary.singleSwap(
                    aerodromeRouter,
                    address(seam),
                    address(usdbc),
                    poolSeamUsdbc,
                    seamBalance,
                    seamSellAmount * 99 / 100,
                    address(this)
                );
            }
        }

        if (totalUsdbc > 0) {
            usdbc.transfer(_beneficiary, totalUsdbc);
        }

        return totalUsdbc;
    }

}
