// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;


import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./interfaces/IGlobalPayoutListener.sol";

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

    function __PayoutListener_init() internal initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        disabled = false;
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(DEFAULT_ADMIN_ROLE)
    override
    {}

    // ---  events

    event AddItem(address token, address pool);
    event DisabledUpdated(bool value);
    event PayoutDoneDisabled();
    event RemoveItem(address token, address pool);
    event PoolOperation(string dexName, string operation, string poolName, address pool, address token, uint256 amount, address to);

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

    function setDisabled(bool _value) external onlyAdmin {
        disabled = _value;
        emit DisabledUpdated(disabled);
    }

    /**
     * Add new item to list or update exist item
     *
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

    function addItems(Item[] memory items) external onlyAdmin {
        for (uint256 x = 0; x < items.length; x++) {
            Item memory item = items[x];
            addItem(item);
        }
    }

    /**
      * Remove item from items
      */

    function removeItem(address token, address pool) public onlyAdmin {
        require(token != address(0), 'token is zero');
        require(pool != address(0), 'pool is zero');

        for (uint256 x = 0; x < items.length; x++) {
            Item memory exitItem = items[x];

            if (exitItem.token == token && exitItem.pool == pool) {
                delete items[x];
                emit RemoveItem(token, pool);
                return;
            }
        }

        revert('item not found');
    }

    /**
      * Remove items
      */
    function removeItems() public onlyAdmin {
        for (uint256 x = 0; x < items.length; x++) {
            delete items[x];
        }
    }

    // --- logic

    /**
      * Skim tokens from pool and transfer profit to address (to)
      */

    function _skim(Item memory item) internal {

        // skim check
        uint256 reserve0 = IPool(item.pool).reserve0();
        uint256 reserve1 = IPool(item.pool).reserve1();
        uint256 token0Balance = IERC20(IPool(item.pool).token0()).balanceOf(item.pool);
        uint256 token1Balance = IERC20(IPool(item.pool).token1()).balanceOf(item.pool);
        if (token0Balance < reserve0 || token1Balance < reserve1) {
            return;
        }

        IERC20 token = IERC20(item.token);
        uint256 tokenBalanceBeforeSkim = token.balanceOf(address(this));
        IPool(item.pool).skim(address(this));
        uint256 amountToken = token.balanceOf(address(this)) - tokenBalanceBeforeSkim;
        uint256 feeAmount;
        if (amountToken > 0) {
            if (item.feePercent > 0) {
                feeAmount = amountToken * item.feePercent / 100;
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

        // skim check
        uint256 reserve0 = IPool(item.pool).reserve0();
        uint256 reserve1 = IPool(item.pool).reserve1();
        uint256 token0Balance = IERC20(IPool(item.pool).token0()).balanceOf(item.pool);
        uint256 token1Balance = IERC20(IPool(item.pool).token1()).balanceOf(item.pool);
        if (token0Balance < reserve0 || token1Balance < reserve1) {
            return;
        }

        IERC20 token = IERC20(item.token);
        uint256 tokenBalanceBeforeSkim = token.balanceOf(address(this));
        IPool(item.pool).skim(address(this));
        uint256 amountToken = token.balanceOf(address(this)) - tokenBalanceBeforeSkim;
        if (amountToken > 0) {
            token.approve(item.bribe, amountToken);
            IBribe(item.bribe).notifyRewardAmount(item.token, amountToken);
            emit PoolOperation(item.dexName, 'Bribe', item.poolName, item.pool, item.token, amountToken, item.bribe);
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
      * After execute sync on pool:
      * - balance LP tokens == balance USD+ tokens
      */

    function _sync(Item memory item) internal {
        IPool(item.pool).sync();
        emit PoolOperation(item.dexName, 'Sync', item.poolName, item.pool, item.token, 0, address(0));
    }

    /**
      * This function executing in payout after increase/decrease liquidity index for USD+|DAI+|ETS tokens
      * see details: Exchange.sol | HedgeExchanger.sol
      */

    function payoutDone(address token) external override onlyExchanger {

        if(disabled){
            emit PayoutDoneDisabled();
            return;
        }

        for (uint256 x = 0; x < items.length; x++) {

            Item memory item = items[x];

            // Items contains all tokens then need filter by token
            if (item.token != token) {
                continue;
            }

            if (item.operation == Operation.SKIM) {
                _skim(item);
            } else if (item.operation == Operation.SYNC) {
                _sync(item);
            } else if (item.operation == Operation.BRIBE) {
                _bribe(item);
            } else {
                _custom(item);
            }
        }
    }


    uint256[50] private __gap;

}

interface IPool {

    function skim(address to) external;

    function sync() external;

    function reserve0() view external returns (uint256);

    function reserve1() view external returns (uint256);

    function token0() view external returns (address);

    function token1() view external returns (address);

}

interface IBribe {
    function notifyRewardAmount(address token, uint amount) external;
}
