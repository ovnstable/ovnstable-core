import "../PayoutManager.sol";
import { IRouter, ThenaLibrary } from "@overnight-contracts/connectors/contracts/stuff/Thena.sol";

contract BscPayoutManager is PayoutManager {

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __PayoutManager_init();
    }


   function bsc() external {

   }

    function _custom(NonRebaseInfo memory info, Item memory item) internal override {
        if (keccak256(bytes(item.dexName)) == keccak256(bytes('Thena'))) {
            _customThena(info, item);
        }
    }

    // Skim all pools on Thena and bribe OVN/USDT+ pool by USDT+
    // USD+ convert to USDT+, because we can only bribe in USDT+, OVN, and whitelisted tokens
    function _customThena(NonRebaseInfo memory info, Item memory item) internal {
        IERC20 token = IERC20(item.token);
        uint256 amountToken = info.amount;
        if (amountToken > 0) {
            if (item.feePercent > 0) {
                uint256 feeAmount = amountToken * item.feePercent / 100;
                amountToken -= feeAmount;
                if (feeAmount > 0) {
                    token.transfer(item.feeReceiver, feeAmount);
                    emit PoolOperation(item.dexName, 'Bribe', item.poolName, item.pool, item.token, feeAmount, item.feeReceiver);
                }
            }
            if (amountToken > 0) {
                uint256 usdtPlusAmount;
                address usdtPlus = address(0x5335E87930b410b8C5BB4D43c3360ACa15ec0C8C);
                if (item.token == usdtPlus) {
                    usdtPlusAmount = amountToken;
                } else {
                    IRouter router = IRouter(address(0xd4ae6eCA985340Dd434D38F470aCCce4DC78D109));
                    usdtPlusAmount = ThenaLibrary.swap(
                        router,
                        item.token,
                        usdtPlus,
                        true,
                        amountToken,
                        0,
                        address(this)
                    );
                }
                if (usdtPlusAmount > 0) {
                    IERC20(usdtPlus).approve(item.bribe, usdtPlusAmount);
                    IBribe(item.bribe).notifyRewardAmount(usdtPlus, usdtPlusAmount);
                    emit PoolOperation(item.dexName, 'Bribe', item.poolName, item.pool, usdtPlus, usdtPlusAmount, item.bribe);
                }
            }
        }
    }
}
