pragma solidity ^0.8.0;

import "../../Insurance.sol";
import "../../interfaces/IHedgeExchanger.sol";
import "../../interfaces/IHedgeStrategy.sol";

contract InsuranceEtsOpUsdc is Insurance {


    IRebaseToken public etsToken;
    IHedgeExchanger public etsExchanger;


    struct SetUpParams {
        address etsToken;
        address etsExchanger;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Insurance_init();
    }


    function setSetup(SetUpParams calldata params) external onlyAdmin {
        etsToken = IRebaseToken(params.etsToken);
        etsExchanger = IHedgeExchanger(params.etsExchanger);
    }


    function _deposit(uint256 _amount) internal override {
        asset.approve(address(etsExchanger), _amount);
        etsExchanger.buy(_amount, '');
    }

    function _withdraw(uint256 _amount) internal override {
        etsToken.approve(address(etsExchanger), _amount);
        etsExchanger.redeem(_amount);
    }

    function netAssetValue() public view override returns (uint256) {
        return etsToken.balanceOf(address(this));
    }

    function getAvgApy() public view override returns (uint256) {
        return 0;
    }

}
