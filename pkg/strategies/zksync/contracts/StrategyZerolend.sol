// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Zerolend.sol";

interface IZkSync {
    function configurePointsOperator(address operator) external;
}

// --- errors

error TokensNotCompatible(address from, address to);
error NotEnoughTokens(address asset, uint256 amount);

contract StrategyZerolend is Strategy {
    IERC20 public usdc;
    IERC20 public z0USDC;
    IPool public pool;
    address public earlyZERO; 


    // --- events
    event StrategyUpdatedParams();

    // --- structs

    struct StrategyParams {
        address usdc;
        address z0USDC;
        address pool;
        address earlyZERO;
    }

    function initialize() initializer public {
    }

    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        usdc = IERC20(params.usdc);
        z0USDC = IERC20(params.z0USDC);
        pool = IPool(params.pool);
        earlyZERO = params.earlyZERO;

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(address _asset, uint256 _amount) internal override {
        if (_asset != address(usdc)) revert TokensNotCompatible(address(usdc), _asset);
        usdc.approve(address(pool), _amount);
        pool.deposit(address(usdc), _amount, address(this), 0);
    }

    function _unstake(address _asset, uint256 _amount, address _beneficiary) internal override returns (uint256) {
        if (_asset != address(usdc)) revert TokensNotCompatible(address(usdc), _asset);
        if (z0USDC.balanceOf(address(this)) < _amount) revert NotEnoughTokens(address(z0USDC), _amount);
        z0USDC.approve(address(pool), _amount);
        uint256 withdrawAmount = pool.withdraw(_asset, _amount, address(this));

        return withdrawAmount;
    }

    function _unstakeFull(address _asset, address _beneficiary) internal override returns (uint256) {
        if (_asset != address(usdc)) revert TokensNotCompatible(address(usdc), _asset);

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
        address(pool).call(
            abi.encodeWithSignature(
                "claimRewards(address[],uint256,address,address)",
                [
                    0xb727F8e11bc417c90D4DcaF82EdA06cf590533B5,
                    0x3E1F1812c2a4f356d1b4FB5Ff7cca5B2ac653b94,
                    0x15b362768465F966F1E5983b7AE87f4C5Bf75C55,
                    0x0325F21eB0A16802E2bACD931964434929985548,
                    0xd97Ac0ce99329EE19b97d03E099eB42D7Aa19ddB,
                    0x41c618CCE58Fb27cAF4EEb1dd25de1d03A0DAAc6,
                    0x016341e6Da8da66b33Fd32189328c102f32Da7CC,
                    0xE60E1953aF56Db378184997cab20731d17c65004,
                    0x9ca4806fa54984Bf5dA4E280b7AA8bB821D21505,
                    0xa333c6FF89525939271E796FbDe2a2D9A970F831,
                    0x2B1BBe3ba39B943eEEf675d6d42607c958F8d20f,
                    0xc3b6D357e0BeADb18A23a53E1dc4839C2D15bdC2,
                    0x54330D2333AdBF715eB449AAd38153378601cf67,
                    0xDB87A5493e308Ee0DEb24C822a559bee52460AFC,
                    0x1f2dA4FF84d46B12f8931766D6D728a806B410d6,
                    0x7c65E6eC6fECeb333092e6FE69672a3475C591fB,
                    0xaBd3C4E4AC6e0d81FCfa5C41a76e9583a8f81909,
                    0x9002ecb8a06060e3b56669c6B8F18E1c3b119914,
                    0x56f58d9BE10929CdA709c4134eF7343D73B080Cf
                ],
                type(uint256).max,
                _beneficiary,
                earlyZERO
            )
        );
        return 0;
    }
}
