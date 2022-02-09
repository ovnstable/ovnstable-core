// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./Strategy.sol";
import "../connectors/aave/interfaces/ILendingPoolAddressesProvider.sol";
import "../connectors/aave/interfaces/ILendingPool.sol";

import "hardhat/console.sol";

contract StrategyAave is Strategy {

    ILendingPoolAddressesProvider public aaveProvider;
    IERC20 public usdcToken;
    IERC20 public aUsdcToken;


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setParams(
        address _aaveProvider,
        address _usdcToken,
        address _aUsdcToken
    ) external onlyAdmin {

        require(_aaveProvider != address(0), "Zero address not allowed");
        require(_usdcToken != address(0), "Zero address not allowed");
        require(_aUsdcToken != address(0), "Zero address not allowed");

        aaveProvider = ILendingPoolAddressesProvider(_aaveProvider);

        usdcToken = IERC20(_usdcToken);
        aUsdcToken = IERC20(_aUsdcToken);
    }


    // --- logic

    function stake(
        address _asset,
        uint256 _amount
    ) external override onlyPortfolioManager {
        require(_asset == address(usdcToken), "Some token not compatible");

        ILendingPool pool = ILendingPool(aaveProvider.getLendingPool());
        usdcToken.approve(address(pool), _amount);

        pool.deposit(address(usdcToken), _amount, address(this), 0);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary,
        bool _targetIsZero
    ) internal override returns (uint256) {
        require(_asset == address(usdcToken), "Some token not compatible");

        ILendingPool pool = ILendingPool(aaveProvider.getLendingPool());
        aUsdcToken.approve(address(pool), _amount);

        uint256 withdrawAmount = pool.withdraw(_asset, _amount, address(this));
        return withdrawAmount;
    }

    function netAssetValue() external view override returns (uint256) {
        return aUsdcToken.balanceOf(address(this));

    }

    function liquidationValue() external view override returns (uint256) {
        return aUsdcToken.balanceOf(address(this));
    }

    function claimRewards(address _beneficiary) external override onlyPortfolioManager returns (uint256) {
        emit Reward(0);
        return 0;
    }

}
