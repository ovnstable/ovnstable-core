// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./Strategy.sol";
import "../connectors/aave/interfaces/ILendingPoolAddressesProvider.sol";
import "../connectors/aave/interfaces/ILendingPool.sol";

import "hardhat/console.sol";

contract StrategyAave is Strategy {

    ILendingPoolAddressesProvider public aave;
    IERC20 public usdc;
    IERC20 public aUsdc;


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setParams(address _aave,
        address _usdc,
        address _aUsdc
    ) external onlyAdmin {

        require(_aave != address(0), "Zero address not allowed");
        require(_usdc != address(0), "Zero address not allowed");
        require(_aUsdc != address(0), "Zero address not allowed");

        aave = ILendingPoolAddressesProvider(_aave);

        usdc = IERC20(_usdc);
        aUsdc = IERC20(_aUsdc);
    }



    // --- logic

    function stake(
        address _asset,
        uint256 _amount
    ) override external onlyPortfolioManager {
        require(_asset == address(usdc), "Some token not compatible");

        ILendingPool pool = ILendingPool(aave.getLendingPool());
        IERC20(usdc).approve(address(pool), _amount);
        pool.deposit(address(usdc), _amount, address(this), 0);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) override internal returns (uint256) {
        require(_asset == address(usdc), "Some token not compatible");

        ILendingPool pool = ILendingPool(aave.getLendingPool());
        aUsdc.approve(address(pool), _amount);

        uint256 withdrawAmount = pool.withdraw(_asset, _amount, _beneficiary);
        return withdrawAmount;
    }


    function netAssetValue() external view override returns (uint256){
        return aUsdc.balanceOf(address(this));

    }

    function liquidationValue() external view override returns (uint256){
        return aUsdc.balanceOf(address(this));
    }

    function claimRewards(address _beneficiary) external override onlyPortfolioManager returns (uint256){
        emit Reward(0);
        return 0;
    }

}
