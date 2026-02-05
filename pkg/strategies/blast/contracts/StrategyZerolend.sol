// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Zerolend.sol";

interface IBlast{
  function configurePointsOperator(address operator) external;
}

contract StrategyZerolend is Strategy {

    IERC20 public usdb;
    IERC20 public z0USDB;

    IPool public pool;

    IRewardsController public rewardsController;

    IERC20 public earlyZERO;
    IERC20 public zBLAST;
 
    address public rewardsWallet;


    // --- events
    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address usdb;
        address z0USDB;
        address pool;
        address rewardsController;
        address earlyZERO;
        address rewardsWallet;
    }


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
        address blastPoints = 0x2536FE9ab3F511540F2f9e2eC2A805005C3Dd800;
        address blastPointsOperator = 0x72D374a68e0cd287EC9FcdB5a9d9Af9E34A3b2f7;
        IBlast(blastPoints).configurePointsOperator(blastPointsOperator);
    }


    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        usdb = IERC20(params.usdb);
        z0USDB = IERC20(params.z0USDB);
        pool = IPool(params.pool);
        rewardsController = IRewardsController(params.rewardsController);
        earlyZERO = IERC20(params.earlyZERO);
        rewardsWallet = params.rewardsWallet;

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
        uint256 rewardsBalance = earlyZERO.balanceOf(address(this));
        if (rewardsWallet != ZERO_ADDRESS && rewardsBalance > 0) earlyZERO.transfer(rewardsWallet, rewardsBalance);
        return 0;
    }

}
