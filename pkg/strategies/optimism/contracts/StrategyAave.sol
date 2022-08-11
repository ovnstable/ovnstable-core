// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "./libraries/UniswapV3Library.sol";
import "./connectors/aave/v3/interfaces/IPoolAddressesProvider.sol";
import "./connectors/aave/v3/interfaces/IPool.sol";
import "./connectors/aave/v3/interfaces/IRewardsController.sol";


contract StrategyAave is Strategy {

    IERC20 public usdcToken;
    IERC20 public aUsdcToken;

    IPoolAddressesProvider public aaveProvider;

    IRewardsController public rewardsController;
    address public uniswapV3Router;
    IERC20 public opToken;
    uint24 public poolFee;


    // --- events
    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address usdc;
        address aUsdc;
        address aaveProvider;
        address rewardsController;
        address uniswapV3Router;
        address op;
        uint24 poolFee;
    }


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        usdcToken = IERC20(params.usdc);
        aUsdcToken = IERC20(params.aUsdc);
        aaveProvider = IPoolAddressesProvider(params.aaveProvider);
        rewardsController = IRewardsController(params.rewardsController);
        uniswapV3Router = params.uniswapV3Router;
        opToken = IERC20(params.op);
        poolFee = params.poolFee;

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(usdcToken), "Some token not compatible");

        IPool pool = IPool(aaveProvider.getPool());
        usdcToken.approve(address(pool), _amount);
        pool.deposit(address(usdcToken), _amount, address(this), 0);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        IPool pool = IPool(aaveProvider.getPool());
        aUsdcToken.approve(address(pool), _amount);
        uint256 withdrawAmount = pool.withdraw(_asset, _amount, address(this));

        return withdrawAmount;
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        uint256 _amount = aUsdcToken.balanceOf(address(this));

        IPool pool = IPool(aaveProvider.getPool());
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

    function _claimRewards(address _beneficiary) internal override returns (uint256) {

        // claim rewards
        uint256 aUsdcBalance = aUsdcToken.balanceOf(address(this));
        if (aUsdcBalance == 0) {
            return 0;
        }

        address[] memory assets = new address[](1);
        assets[0] = address(aUsdcToken);
        (address[] memory rewardsList, uint256[] memory claimedAmounts) = rewardsController.claimAllRewardsToSelf(assets);

        // sell rewards
        uint256 totalUsdc;

        uint256 opBalance = opToken.balanceOf(address(this));
        if (opBalance > 0) {
            uint256 opUsdc = UniswapV3Library._uniswapV3InputSingleSwap(
                uniswapV3Router,
                address(opToken),
                address(usdcToken),
                poolFee,
                opBalance,
                0,
                address(this)
            );
            totalUsdc += opUsdc;
        }

        if (totalUsdc > 0) {
            usdcToken.transfer(_beneficiary, totalUsdc);
        }

        return totalUsdc;
    }

}
