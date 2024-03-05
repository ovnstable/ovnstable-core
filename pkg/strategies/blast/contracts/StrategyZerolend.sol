// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Zerolend.sol";

contract StrategyZerolend is Strategy {

    IERC20 public usdb;
    IERC20 public z0USDB;

    IPool public pool;

    IRewardsController public rewardsController;

    IERC20 public earlyZERO;
    IERC20 public zBLAST;

    // --- events
    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address usdb;
        address z0USDB;
        address pool;
        address rewardsController;
        address earlyZERO;
        address zBLAST;
    }


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        usdb = IERC20(params.usdb);
        z0USDB = IERC20(params.z0USDB);
        pool = IPool(params.pool);
        rewardsController = IRewardsController(params.rewardsController);
        earlyZERO = IERC20(params.earlyZERO);
        zBLAST = IERC20(params.zBLAST);

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(usdb), "Some token not compatible");

        usdb.approve(address(pool), _amount);
        pool.deposit(address(usdb), _amount, address(this), 0);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdb), "Some token not compatible");

        z0USDB.approve(address(pool), _amount);
        uint256 withdrawAmount = pool.withdraw(_asset, _amount, address(this));

        return withdrawAmount;
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdb), "Some token not compatible");

        uint256 _amount = z0USDB.balanceOf(address(this));

        z0USDB.approve(address(pool), _amount);
        uint256 withdrawAmount = pool.withdraw(_asset, _amount, address(this));

        return withdrawAmount;
    }

    function netAssetValue() external view override returns (uint256) {
        return usdb.balanceOf(address(this)) + z0USDB.balanceOf(address(this));
    }

    function liquidationValue() external view override returns (uint256) {
        return usdb.balanceOf(address(this)) + z0USDB.balanceOf(address(this));
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {

        address ZERO_ADDRESS = 0x0000000000000000000000000000000000000000;
        if (address(rewardsController) == ZERO_ADDRESS) {
            return 0;
        }

        // claim rewards
        uint256 z0USDBBalance = z0USDB.balanceOf(address(this));
        if (z0USDBBalance == 0) {
            return 0;
        }

        address[] memory assets = new address[](1);
        assets[0] = address(z0USDB);
        uint256 claimedBalance = rewardsController.claimRewards(assets, type(uint256).max, address(this), address(earlyZERO));

        return 0;
    }

}
