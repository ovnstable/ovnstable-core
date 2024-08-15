// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Venus.sol";
import "@overnight-contracts/connectors/contracts/stuff/PancakeV2.sol";

contract StrategyVenusUsdt is Strategy {

    IERC20 public usdt;
    VenusInterface public vUsdt;
    Unitroller public unitroller;
    IPancakeRouter02 public pancakeRouter;
    IERC20 public xvs;
    IERC20 public wbnb;

    // --- events
    event StrategyUpdatedParams();

    // --- structs

    struct StrategyParams {
        address usdt;
        address vUsdt;
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
        usdt = IERC20(params.usdt);
        vUsdt = VenusInterface(params.vUsdt);
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

        require(_asset == address(usdt), "Some token not compatible");

        usdt.approve(address(vUsdt), _amount);
        vUsdt.mint(_amount);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdt), "Some token not compatible");

        vUsdt.redeemUnderlying(_amount);
        return usdt.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdt), "Some token not compatible");

        vUsdt.redeem(vUsdt.balanceOf(address(this)));
        return usdt.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        return usdt.balanceOf(address(this)) + vUsdt.balanceOf(address(this)) * vUsdt.exchangeRateStored() / 1e18;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        if (vUsdt.balanceOf(address(this)) > 0) {
            address[] memory tokens = new address[](1);
            tokens[0] = address(vUsdt);
            unitroller.claimVenus(address(this), tokens);
        }

        // sell rewards
        uint256 totalUsdt;

        uint256 xvsBalance = xvs.balanceOf(address(this));
        if (xvsBalance > 0) {
            uint256 xvsAmountOut = PancakeSwapLibrary.getAmountsOut(
                pancakeRouter,
                address(xvs),
                address(wbnb),
                address(usdt),
                xvsBalance
            );

            if (xvsAmountOut > 0) {
                totalUsdt += PancakeSwapLibrary.swapExactTokensForTokens(
                    pancakeRouter,
                    address(xvs),
                    address(wbnb),
                    address(usdt),
                    xvsBalance,
                    xvsAmountOut * 99 / 100,
                    address(this)
                );
            }
        }

        if (totalUsdt > 0) {
            usdt.transfer(_to, totalUsdt);
        }

        return totalUsdt;
    }

}
