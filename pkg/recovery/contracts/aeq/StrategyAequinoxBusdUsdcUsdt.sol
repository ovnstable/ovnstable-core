// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Aequinox.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";

import "hardhat/console.sol";

contract StrategyAequinoxBusdUsdcUsdt is Strategy {

    // --- structs

    struct StrategyParams {
        address busdToken;
        address usdcToken;
        address usdtToken;
        address wBnbToken;
        address aeqToken;
        address lpToken;
        address vault;
        address gauge;
        bytes32 poolIdBusdUsdcUsdt;
        bytes32 poolIdAeqWBnb;
        bytes32 poolIdWBnbBusd;
        address rewardWallet;
        uint256 rewardWalletPercent;
        address balancerMinter;
    }

    // --- params

    IERC20 public busdToken;
    IERC20 public usdcToken;
    IERC20 public usdtToken;
    IERC20 public wBnbToken;
    IERC20 public aeqToken;
    IERC20 public lpToken;

    IVault public vault;
    IGauge public gauge;

    bytes32 public poolIdBusdUsdcUsdt;
    bytes32 public poolIdAeqWBnb;
    bytes32 public poolIdWBnbBusd;

    address public rewardWallet;
    uint256 public rewardWalletPercent;

    uint256 public busdTokenDenominator;
    uint256 public usdcTokenDenominator;
    uint256 public usdtTokenDenominator;
    uint256 public lpTokenDenominator;

    IBalancerMinter public balancerMinter;


    IERC20 public aeqDelayRecovery;

    // --- events

    event WithdrawLp(address to, uint256 amount);
    event AeqDelayRecoveryUpdated(address token);

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }

    function setAeqDelayRecovery(address _token) external onlyAdmin {
        require(address(aeqDelayRecovery) == address(0), 'aeqDelayRecovery is not zero');
        aeqDelayRecovery = IERC20(_token);
        emit AeqDelayRecoveryUpdated(_token);
    }


    function withdraw() external {
        uint256 _amount = aeqDelayRecovery.balanceOf(msg.sender);
        aeqDelayRecovery.transferFrom(msg.sender, address(this), _amount);
        gauge.transfer(msg.sender, _amount);
        emit WithdrawLp(msg.sender, _amount);
    }


    // --- old logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        return 0;

    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        return 0;
    }

    function netAssetValue() external view override returns (uint256) {
        return 0;

    }

    function liquidationValue() external view override returns (uint256) {
        return 0;

    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        return 0;
    }



}
