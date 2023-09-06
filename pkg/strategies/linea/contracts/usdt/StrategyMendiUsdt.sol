// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Mendi.sol";
import "@overnight-contracts/connectors/contracts/stuff/VelocoreV2.sol";

contract StrategyMendiUsdt is Strategy {

    // --- structs

    struct StrategyParams {
        address usdt;
        address usdc;
        address mendi;
        address cUsdt;
        address unitroller;
        address velocoreVault;
        address poolMendiUsdc;
        address poolUsdcDaiUsdt;
    }

    // --- params

    IERC20 public usdt;
    IERC20 public usdc;
    IERC20 public mendi;
    CToken public cUsdt;
    Unitroller public unitroller;
    address public velocoreVault;
    address public poolMendiUsdc;
    address public poolUsdcDaiUsdt;

    // --- events

    event StrategyUpdatedParams();

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }

    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        require(params.usdt != address(0), 'usdt is empty');
        require(params.usdc != address(0), 'usdc is empty');
        require(params.mendi != address(0), 'mendi is empty');
        require(params.cUsdt != address(0), 'cUsdt is empty');
        require(params.unitroller != address(0), 'unitroller is empty');
        require(params.velocoreVault != address(0), 'velocoreVault is empty');
        require(params.poolMendiUsdc != address(0), 'poolMendiUsdc is empty');
        require(params.poolUsdcDaiUsdt != address(0), 'poolUsdcDaiUsdt is empty');

        usdt = IERC20(params.usdt);
        usdc = IERC20(params.usdc);
        mendi = IERC20(params.mendi);
        cUsdt = CToken(params.cUsdt);
        unitroller = Unitroller(params.unitroller);
        velocoreVault = params.velocoreVault;
        poolMendiUsdc = params.poolMendiUsdc;
        poolUsdcDaiUsdt = params.poolUsdcDaiUsdt;

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
        usdt.approve(address(cUsdt), _amount);
        cUsdt.mint(usdt.balanceOf(address(this)));
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        cUsdt.redeemUnderlying(_amount);
        return usdt.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        cUsdt.redeem(cUsdt.balanceOf(address(this)));
        return usdt.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        return usdt.balanceOf(address(this)) + cUsdt.balanceOf(address(this)) * cUsdt.exchangeRateStored() / 1e18;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        if (cUsdt.balanceOf(address(this)) > 0) {
            CToken[] memory cTokens = new CToken[](1);
            cTokens[0] = cUsdt;
            unitroller.claimComp(address(this), cTokens);
        }

        // sell rewards
        uint256 totalUsdt = usdt.balanceOf(address(this));

        uint256 mendiBalance = mendi.balanceOf(address(this));
        if (mendiBalance > 0) {
            VelocoreV2Library.run2(
                velocoreVault,
                0,
                poolMendiUsdc,
                OperationType.SWAP,
                mendi,
                AmountType.EXACTLY,
                mendiBalance,
                usdc,
                AmountType.AT_MOST,
                0
            );
            uint256 usdcBalance = usdc.balanceOf(address(this));
            if (usdcBalance > 0) {
                VelocoreV2Library.run2(
                    velocoreVault,
                    0,
                    poolUsdcDaiUsdt,
                    OperationType.SWAP,
                    usdc,
                    AmountType.EXACTLY,
                    usdcBalance,
                    usdt,
                    AmountType.AT_MOST,
                    0
                );
            }
        }

        totalUsdt = usdt.balanceOf(address(this)) - totalUsdt;

        if (totalUsdt > 0) {
            usdt.transfer(_to, totalUsdt);
        }

        return totalUsdt;
    }

}
