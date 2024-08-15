// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IGlobalPayoutListener.sol";
import "./interfaces/IRoleManager.sol";


abstract contract GlobalPayoutListener is IGlobalPayoutListener, Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant EXCHANGER = keccak256("EXCHANGER");

    struct Item {
        // Unique ID = pool + token
        address pool;
        address token;
        string poolName;
        address bribe;
        Operation operation;
        address to;
        string dexName;
        uint24 feePercent;
        address feeReceiver;
        uint256[10] __gap;
    }

    enum Operation {
        SKIM,
        SYNC,
        BRIBE,
        CUSTOM
    }

    Item[] public items;

    bool public disabled; // Admin can disable to executing PayoutDone
    bool public undoneDisabled; // Admin can disable to executing PayoutUndone

    function __PayoutListener_init() internal initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(DEFAULT_ADMIN_ROLE)
    override
    {}

    // ---  events

    event AddItem(address token, address pool);
    event RemoveItem(address token, address pool);
    event PoolOperation(string dexName, string operation, string poolName, address pool, address token, uint256 amount, address to);
    event DisabledUpdated(bool disabled, bool undoneDisabled);
    event PayoutDoneDisabled();
    event PayoutUndoneDisabled();

    // ---  modifiers

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    modifier onlyExchanger() {
        require(hasRole(EXCHANGER, msg.sender), "Caller is not the EXCHANGER");
        _;
    }

    // --- setters

    function setDisabled(bool _disabled, bool _undoneDisabled) external onlyAdmin {
        disabled = _disabled;
        undoneDisabled = _undoneDisabled;
        emit DisabledUpdated(disabled, undoneDisabled);
    }


    // --- logic

    /**
     * Get items
     */
    function getItems() external view returns (Item[] memory) {
        return items;
    }

    /**
     * Get items length
     */
    function getItemsLength() external view returns (uint256) {
        return items.length;
    }

    /**
     * Find items by pool address
     */
    function findItemsByPool(address pool) external view returns (Item[] memory) {
        uint256 j;
        for (uint256 x = 0; x < items.length; x++) {
            if (items[x].pool == pool) {
                j++;
            }
        }

        Item[] memory foundItems = new Item[](j);
        uint256 p = 0;
        for (uint256 i = 0; i < items.length; i++) {
            if (items[i].pool == pool) {
                Item memory item = items[i];
                foundItems[p] = item;
                p++;
            }
        }

        return foundItems;
    }

    /**
     * Add new item to list or update exist item
     */
    function addItem(Item memory item) public onlyAdmin {
        require(item.token != address(0), 'token is zero');
        require(item.pool != address(0), 'pool is zero');

        if (item.operation == Operation.SKIM) {
            require(item.to != address(0), 'to is zero');
        } else if (item.operation == Operation.BRIBE) {
            require(item.bribe != address(0), 'bribe is zero');
        }

        bool isNew = true;
        for (uint256 x = 0; x < items.length; x++) {
            Item memory exitItem = items[x];

            if (exitItem.token == item.token && exitItem.pool == item.pool) {
                items[x] = item;
                isNew = false;
            }
        }

        if (isNew) {
            items.push(item);
        }

        emit AddItem(item.token, item.pool);
    }

    /**
     * Add new items to list or update exist items
     */
    function addItems(Item[] memory items) external onlyAdmin {
        for (uint256 x = 0; x < items.length; x++) {
            Item memory item = items[x];
            addItem(item);
        }
    }

    /**
     * Remove item from items
     */
    function removeItem(address token, address pool) external onlyAdmin {
        require(token != address(0), 'token is zero');
        require(pool != address(0), 'pool is zero');

        for (uint256 x = 0; x < items.length; x++) {
            Item memory exitItem = items[x];

            if (exitItem.token == token && exitItem.pool == pool) {
                for (uint i = x; i < items.length - 1; i++) {
                    Item memory tempItem = items[i + 1];
                    items[i] = tempItem;
                }
                items.pop();
                emit RemoveItem(token, pool);
                return;
            }
        }

        revert('item not found');
    }

    /**
     * Remove items
     */
    function removeItems() external onlyAdmin {
        uint256 length = items.length;
        for (uint256 x = 0; x < length; x++) {
            items.pop();
        }
    }

    /**
     * This function executing in payout before increase/decrease liquidity index for USD+|DAI+|ETS tokens
     * see details: Exchange.sol | HedgeExchanger.sol
     */
    function payoutUndone(address token) external override onlyExchanger {

        if (undoneDisabled) {
            emit PayoutUndoneDisabled();
            return;
        }

        for (uint256 x = 0; x < items.length; x++) {

            Item memory item = items[x];

            // Items contains all tokens then need filter by token
            if (item.token != token) {
                continue;
            }

            if (item.operation == Operation.CUSTOM) {
                _customUndone(item);
            }
        }
    }

    /**
     * This function executing in payout after increase/decrease liquidity index for USD+|DAI+|ETS tokens
     * see details: Exchange.sol | HedgeExchanger.sol
     */
    function payoutDone(address token) external override onlyExchanger {

        if (disabled) {
            emit PayoutDoneDisabled();
            return;
        }

        for (uint256 x = 0; x < items.length; x++) {

            Item memory item = items[x];

            // Items contains all tokens then need filter by token
            if (item.token != token) {
                continue;
            }

            if (item.operation == Operation.SYNC) {
                _sync(item);
            } else if (item.operation == Operation.SKIM) {
                _skim(item);
            } else if (item.operation == Operation.BRIBE) {
                _bribe(item);
            } else {
                _custom(item);
            }
        }
    }

    /**
     * After execute sync on pool:
     * - balance LP tokens == balance USD+ tokens
     */
    function _sync(Item memory item) internal {
        IPool(item.pool).sync();
        emit PoolOperation(item.dexName, 'Sync', item.poolName, item.pool, item.token, 0, address(0));
    }

    /**
     * Skim tokens from pool and transfer profit to address (to)
     */
    function _skim(Item memory item) internal {
        IERC20 token = IERC20(item.token);
        uint256 tokenBalanceBeforeSkim = token.balanceOf(address(this));
        IPool(item.pool).skim(address(this));
        uint256 amountToken = token.balanceOf(address(this)) - tokenBalanceBeforeSkim;
        if (amountToken > 0) {
            if (item.feePercent > 0) {
                uint256 feeAmount = amountToken * item.feePercent / 100;
                amountToken -= feeAmount;
                if (feeAmount > 0) {
                    token.transfer(item.feeReceiver, feeAmount);
                    emit PoolOperation(item.dexName, 'Skim', item.poolName, item.pool, item.token, feeAmount, item.feeReceiver);
                }
            }
            if (amountToken > 0) {
                token.transfer(item.to, amountToken);
                emit PoolOperation(item.dexName, 'Skim', item.poolName, item.pool, item.token, amountToken, item.to);
            }
        }
    }

    /**
     * Skim tokens from pool and transfer profit as bribes
     */
    function _bribe(Item memory item) internal {
        IERC20 token = IERC20(item.token);
        uint256 tokenBalanceBeforeSkim = token.balanceOf(address(this));
        IPool(item.pool).skim(address(this));
        uint256 amountToken = token.balanceOf(address(this)) - tokenBalanceBeforeSkim;
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
                token.approve(item.bribe, amountToken);
                IBribe(item.bribe).notifyRewardAmount(item.token, amountToken);
                emit PoolOperation(item.dexName, 'Bribe', item.poolName, item.pool, item.token, amountToken, item.bribe);
            }
        }
    }

    /**
     * Override this method for unique behavior smart-contracts.
     * If standard skim/sync/bribe not allow use.
     */
    function _custom(Item memory item) internal virtual {
        revert("Custom not implemented");
    }

    /**
     * Runs before payout for custom logic e.g. UniV3 pools.
     * In most cases this function must be empty.
     */
    function _customUndone(Item memory item) internal virtual {
    }


    uint256[49] private __gap;

}

interface IPool {

    function skim(address to) external;

    function sync() external;

}

interface IBribe {
    function notifyRewardAmount(address token, uint amount) external;
}
