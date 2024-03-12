import "../PayoutManager.sol";

contract BasePayoutManager is PayoutManager {
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
        if (amountToken > 0) {
            if (item.feePercent > 0) {
                uint256 feeAmount = (amountToken * item.feePercent) / 100;
                amountToken -= feeAmount;
                if (feeAmount > 0) {
                    token.transfer(item.feeReceiver, feeAmount);
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
            }
            token.transfer(item.bribe, amountToken);
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
