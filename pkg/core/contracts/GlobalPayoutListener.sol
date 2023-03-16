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
        address pool; // Unique ID = pool + token
        address token;
        string poolName;
        address bribe;
        Operation operation;
        address to;
        string dexName;
    }

    enum Operation {
        SKIM,
        SYNC,
        BRIBE,
        CUSTOM
    }

    Item[] public items;

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

    event SetItem(address token, address pool);
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

    /**
     * Add new item to list or update exist item
     *
     */

    function setItem(Item memory item) external onlyAdmin {
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

            if(exitItem.token == item.token && exitItem.pool == item.pool){
                items[x] = item;
                isNew = false;
            }
        }

        if(isNew){
            items.push(item);
        }

        emit SetItem(item.token, item.pool);
    }

    function removeItem(address token, address pool) external onlyAdmin {
        require(token != address(0), 'token is zero');
        require(pool != address(0), 'pool is zero');

        for (uint256 x = 0; x < items.length; x++) {
            Item memory exitItem = items[x];

            if(exitItem.token == token && exitItem.pool == pool){
                delete items[x];
                emit RemoveItem(token, pool);
                return;
            }
        }

        revert('item not found');
    }

    // --- logic

    function _skim(Item memory item) internal {

        IERC20 token = IERC20(item.token);
        uint256 tokenBalanceBeforeSkim = token.balanceOf(address(this));
        IPool(item.pool).skim(address(this));
        uint256 amountToken = token.balanceOf(address(this)) - tokenBalanceBeforeSkim;
        if (amountToken > 0) {
            token.transfer(item.to, amountToken);
        }
        emit PoolOperation(item.dexName, 'Skim', item.poolName, item.pool, item.token, amountToken, item.to);
    }

    function _bribe(Item memory item) internal {

        IERC20 token = IERC20(item.token);
        uint256 tokenBalanceBeforeSkim = token.balanceOf(address(this));
        IPool(item.pool).skim(address(this));
        uint256 amountToken = token.balanceOf(address(this)) - tokenBalanceBeforeSkim;
        if (amountToken > 0) {
            token.approve(item.bribe, amountToken);
            IBribe(item.bribe).notifyRewardAmount(item.token, amountToken);
        }
        emit PoolOperation(item.dexName, 'Bribe', item.poolName, item.pool, item.token, amountToken, item.bribe);
    }

    function _custom(Item memory item) internal virtual {
        revert("Custom not implemented");
    }

    function _sync(Item memory item) internal {
        IPool(item.pool).sync();
        emit PoolOperation(item.dexName, 'Sync', item.poolName, item.pool, item.token, 0, address(0));
    }

    function payoutDone(address token) external override onlyExchanger {


        for (uint256 x = 0; x < items.length; x++) {

            Item memory item = items[x];

            // Items contains all tokens then need filter by token
            if(item.token != token){
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

}

interface IBribe {
    function notifyRewardAmount(address token, uint amount) external;
}
