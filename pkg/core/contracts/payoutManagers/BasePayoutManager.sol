// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '../PayoutManager.sol';
import { IRouter, IPool } from '@overnight-contracts/connectors/contracts/stuff/Aerodrome.sol';

contract BasePayoutManager is PayoutManager {
    using SafeERC20 for IERC20;

    address constant AERODROME_ROUTER = 0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() public initializer {
        __PayoutManager_init();
    }

    function base() external {}

    function _custom(NonRebaseInfo memory info, Item memory item) internal override {
        if (keccak256(bytes(item.dexName)) == keccak256(bytes('Aerodrome'))) {
            _customAerodrome(info, item);
        }
    }

    function _customAerodrome(NonRebaseInfo memory info, Item memory item) internal {
        IERC20 token = IERC20(item.token);
        uint256 amountToken = info.amount;

        if (amountToken > 0) {
            if (item.feePercent > 0) {
                uint256 feeAmount = (amountToken * item.feePercent) / 100;
                amountToken -= feeAmount;
                if (feeAmount > 0) {
                    token.transfer(item.feeReceiver, feeAmount);
                    emit PoolOperation(item.dexName, 'Bribe', item.poolName, item.pool, item.token, feeAmount, item.feeReceiver);
                }
            }
            if (amountToken > 0) {
                uint256 ovnAmount;
                address ovn = address(0xA3d1a8DEB97B111454B294E2324EfAD13a9d8396);
                address usdPlus = address(0xB79DD08EA68A908A97220C76d19A6aA9cBDE4376);
                address usdcPlus = address(0x85483696Cc9970Ad9EdD786b2C5ef735F38D156f);
                if (item.token == ovn) {
                    ovnAmount = amountToken;
                } else {
                    address vAmmPool = address(0x61366A4e6b1DB1b85DD701f2f4BFa275EF271197); // vAMM-OVN/USD+
                    address sAmmPool = address(0xE96c788E66a97Cf455f46C5b27786191fD3bC50B); // sAMM-USDC+/USD+

                    if (item.token == usdPlus) {
                        ovnAmount = _swapTokensAerodrome(vAmmPool, item.token, ovn, amountToken);
                    } else if (item.token == usdcPlus) {
                        uint256 usdPlusAmount = _swapTokensAerodrome(sAmmPool, item.token, usdPlus, amountToken);
                        ovnAmount = _swapTokensAerodrome(vAmmPool, usdPlus, ovn, usdPlusAmount);
                    } else {
                        revert('Unsupported token for Aerodrome swap');
                    }
                }
                if (ovnAmount > 0) {
                    IERC20(ovn).approve(item.to, ovnAmount);
                    IBribe(item.to).notifyRewardAmount(ovn, ovnAmount);
                    emit PoolOperation(item.dexName, 'Bribe', item.poolName, item.pool, ovn, ovnAmount, item.to);
                }
            }
        }
    }

    function _swapTokensAerodrome(address pool, address tokenIn, address tokenOut, uint256 amountIn) internal returns (uint256) {
        IERC20(tokenIn).safeApprove(AERODROME_ROUTER, amountIn);

        IRouter.Route[] memory routes = new IRouter.Route[](1);
        routes[0] = IRouter.Route({ from: tokenIn, to: tokenOut, stable: IPool(pool).stable(), factory: IPool(pool).factory() });

        uint256 deadline = block.timestamp + 300;
        uint256[] memory amounts = IRouter(AERODROME_ROUTER).swapExactTokensForTokens(amountIn, 0, routes, address(this), deadline);

        return amounts[amounts.length - 1];
    }
}
