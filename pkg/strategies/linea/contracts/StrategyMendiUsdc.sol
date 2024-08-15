// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Mendi.sol";
import "@overnight-contracts/connectors/contracts/stuff/VelocoreV2.sol";

contract StrategyMendiUsdc is Strategy {

    // --- structs

    struct StrategyParams {
        address usdc;
        address mendi;
        address cUsdc;
        address unitroller;
        address velocoreVault;
        address poolMendiUsdc;
    }

    // --- params

    IERC20 public usdc;
    IERC20 public mendi;
    CToken public cUsdc;
    Unitroller public unitroller;
    address public velocoreVault;
    address public poolMendiUsdc;

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
        require(params.usdc != address(0), 'usdc is empty');
        require(params.mendi != address(0), 'mendi is empty');
        require(params.cUsdc != address(0), 'cUsdc is empty');
        require(params.unitroller != address(0), 'unitroller is empty');
        require(params.velocoreVault != address(0), 'velocoreVault is empty');
        require(params.poolMendiUsdc != address(0), 'poolMendiUsdc is empty');

        usdc = IERC20(params.usdc);
        mendi = IERC20(params.mendi);
        cUsdc = CToken(params.cUsdc);
        unitroller = Unitroller(params.unitroller);
        velocoreVault = params.velocoreVault;
        poolMendiUsdc = params.poolMendiUsdc;

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
        usdc.approve(address(cUsdc), _amount);
        cUsdc.mint(usdc.balanceOf(address(this)));
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        cUsdc.redeemUnderlying(_amount);
        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        cUsdc.redeem(cUsdc.balanceOf(address(this)));
        return usdc.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        return usdc.balanceOf(address(this)) + cUsdc.balanceOf(address(this)) * cUsdc.exchangeRateStored() / 1e18;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        if (cUsdc.balanceOf(address(this)) > 0) {
            CToken[] memory cTokens = new CToken[](1);
            cTokens[0] = cUsdc;
            unitroller.claimComp(address(this), cTokens);
        }

        // sell rewards
        uint256 totalUsdc = usdc.balanceOf(address(this));

        uint256 mendiBalance = mendi.balanceOf(address(this));
        if (mendiBalance > 0) {
            VelocoreV2Library.run2(
                velocoreVault,
                0,
                poolMendiUsdc,
                OperationType.SWAP,
                address(mendi),
                AmountType.EXACTLY,
                mendiBalance,
                address(usdc),
                AmountType.AT_MOST,
                0
            );
        }

        totalUsdc = usdc.balanceOf(address(this)) - totalUsdc;

        if (totalUsdc > 0) {
            usdc.transfer(_to, totalUsdc);
        }

        return totalUsdc;
    }

}
