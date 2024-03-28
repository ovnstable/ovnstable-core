// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Zerolend.sol";

interface IZkSync{
  function configurePointsOperator(address operator) external;
}

contract StrategyZerolend is Strategy {

    IERC20 public usdc;
    IERC20 public z0USDC;

    IPool public pool;

    IRewardsController public rewardsController;

    IERC20 public earlyZERO;
    IERC20 public zSYNC;

    // --- events
    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address usdc;
        address z0USDC;
        address pool;
        address rewardsController;
        address earlyZERO;
        address zSYNC;
    }


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}
 


    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        usdc = IERC20(params.usdc);
        z0USDC = IERC20(params.z0USDC);
        pool = IPool(params.pool);
        rewardsController = IRewardsController(params.rewardsController);
        earlyZERO = IERC20(params.earlyZERO);
        zSYNC = IERC20(params.zSYNC);

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(usdc), "Some token not compatible");

        usdc.approve(address(pool), _amount);
        pool.deposit(address(usdc), _amount, address(this), 0);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdc), "Some token not compatible");

        z0USDC.approve(address(pool), _amount);
        uint256 withdrawAmount = pool.withdraw(_asset, _amount, address(this));

        return withdrawAmount;
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdc), "Some token not compatible");

        uint256 _amount = z0USDC.balanceOf(address(this));

        z0USDC.approve(address(pool), _amount);
        uint256 withdrawAmount = pool.withdraw(_asset, _amount, address(this));

        return withdrawAmount;
    }

    function netAssetValue() external view override returns (uint256) {
        return usdc.balanceOf(address(this)) + z0USDC.balanceOf(address(this));
    }

    function liquidationValue() external view override returns (uint256) {
        return usdc.balanceOf(address(this)) + z0USDC.balanceOf(address(this));
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {

        address ZERO_ADDRESS = 0x0000000000000000000000000000000000000000;
        if (address(rewardsController) == ZERO_ADDRESS) {
            return 0;
        }

        // claim rewards
        uint256 z0USDCBalance = z0USDC.balanceOf(address(this));
        if (z0USDCBalance == 0) {
            return 0;
        }

        address[] memory assets = new address[](1);
        assets[0] = address(z0USDC);
        uint256 claimedBalance = rewardsController.claimRewards(assets, type(uint256).max, address(this), address(earlyZERO));

        return 0;
    }

}
