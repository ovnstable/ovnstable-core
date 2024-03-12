// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../PayoutManager.sol";

contract BasePayoutManager is PayoutManager {
    using SafeERC20 for IERC20;
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() public initializer {
        __PayoutManager_init();
    }

    function base() external {}

    function _custom(NonRebaseInfo memory info, Item memory item) internal override {
        if (keccak256(bytes(item.dexName)) == keccak256(bytes("Extra.fi"))) {
            _customExtraFi(info, item);
        }
    }

    function _customExtraFi(NonRebaseInfo memory info, Item memory item) internal {
        IERC20 token = IERC20(item.token);
        uint256 amountToken = info.amount;
        if (amountToken > 0 && item.feePercent > 0) {
            uint256 feeAmount = (amountToken * item.feePercent) / 100;
            amountToken -= feeAmount;
            token.safeTransfer(item.feeReceiver, feeAmount);
            emit PoolOperation(
                item.dexName,
                "Reward",
                item.poolName,
                item.pool,
                item.token,
                feeAmount,
                item.feeReceiver
            );
        }
        if (amountToken > 0) {
            token.safeTransfer(item.bribe, amountToken);
            emit PoolOperation(
                item.dexName,
                "Bribe",
                item.poolName,
                item.pool,
                item.token,
                amountToken,
                item.bribe
            );
        }
    }
}
