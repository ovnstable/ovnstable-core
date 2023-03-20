// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Venus.sol";
import "@overnight-contracts/connectors/contracts/stuff/PancakeV2.sol";

contract StrategyVenusUsdc is Strategy {

    IERC20 public usdc;
    VenusInterface public vUsdc;
    Unitroller public unitroller;
    IPancakeRouter02 public pancakeRouter;
    IERC20 public xvs;
    IERC20 public wbnb;

    // --- events
    event StrategyUpdatedParams();

    // --- structs

    struct StrategyParams {
        address usdc;
        address vUsdc;
        address unitroller;
        address pancakeRouter;
        address xvs;
        address wbnb;
    }

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }

    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        usdc = IERC20(params.usdc);
        vUsdc = VenusInterface(params.vUsdc);
        unitroller = Unitroller(params.unitroller);
        pancakeRouter = IPancakeRouter02(params.pancakeRouter);
        xvs = IERC20(params.xvs);
        wbnb = IERC20(params.wbnb);

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(usdc), "Some token not compatible");

        usdc.approve(address(vUsdc), _amount);
        vUsdc.mint(_amount);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdc), "Some token not compatible");

        vUsdc.redeemUnderlying(_amount);
        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdc), "Some token not compatible");

        vUsdc.redeem(vUsdc.balanceOf(address(this)));
        return usdc.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        return usdc.balanceOf(address(this)) + vUsdc.balanceOf(address(this)) * vUsdc.exchangeRateStored() / 1e18;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        if (vUsdc.balanceOf(address(this)) > 0) {
            address[] memory tokens = new address[](1);
            tokens[0] = address(vUsdc);
            unitroller.claimVenus(address(this), tokens);
        }

        // sell rewards
        uint256 totalUsdc;

        uint256 xvsBalance = xvs.balanceOf(address(this));
        if (xvsBalance > 0) {
            uint256 xvsAmountOut = PancakeSwapLibrary.getAmountsOut(
                pancakeRouter,
                address(xvs),
                address(wbnb),
                address(usdc),
                xvsBalance
            );

            if (xvsAmountOut > 0) {
                totalUsdc += PancakeSwapLibrary.swapExactTokensForTokens(
                    pancakeRouter,
                    address(xvs),
                    address(wbnb),
                    address(usdc),
                    xvsBalance,
                    xvsAmountOut * 99 / 100,
                    address(this)
                );
            }
        }

        if (totalUsdc > 0) {
            usdc.transfer(_to, totalUsdc);
        }

        return totalUsdc;
    }

}
