// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IPayoutManager.sol";
import "./interfaces/IRoleManager.sol";
import "./interfaces/IUsdPlusToken.sol";

import "hardhat/console.sol";

abstract contract PayoutManager is IPayoutManager, Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant EXCHANGER = keccak256("EXCHANGER");
    bytes32 public constant UNIT_ROLE = keccak256("UNIT_ROLE");

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
    IRoleManager public roleManager;
    address public rewardWallet;

    function __PayoutManager_init() internal initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        rewardWallet = 0x9030D5C596d636eEFC8f0ad7b2788AE7E9ef3D46;
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
    event DisabledUpdated(bool disabled);
    event RoleManagerUpdated(address roleManager);
    event PayoutDoneDisabled();
    event RewardWalletUpdated(address rewardWallet);

    // ---  modifiers

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    modifier onlyExchanger() {
        require(hasRole(EXCHANGER, msg.sender), "Caller is not the EXCHANGER");
        _;
    }

    modifier onlyUnit(){
        require(roleManager.hasRole(UNIT_ROLE, msg.sender), "Restricted to Unit");
        _;
    }

    // --- setters

    function setDisabled(bool _disabled) external onlyUnit {
        disabled = _disabled;
        emit DisabledUpdated(disabled);
    }

    function setRoleManager(address _roleManager) external onlyAdmin {
        require(_roleManager != address(0), "Zero address not allowed");
        roleManager = IRoleManager(_roleManager);
        emit RoleManagerUpdated(_roleManager);
    }

    function setRewardWallet(address _rewardWallet) external onlyAdmin {
        require(_rewardWallet != address(0), "Zero address not allowed");
        rewardWallet = _rewardWallet;
        emit RewardWalletUpdated(rewardWallet);
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
    function addItem(Item memory item) public onlyUnit {
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
            IUsdPlusToken(item.token).rebaseOptOut(item.pool);
        }

        emit AddItem(item.token, item.pool);
    }

    /**
     * Add new items to list or update exist items
     */
    function addItems(Item[] memory items) external onlyUnit {
        for (uint256 x = 0; x < items.length; x++) {
            Item memory item = items[x];
            addItem(item);
        }
    }

    /**
     * Remove item from items
     */
    function removeItem(address token, address pool) external onlyUnit {
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
                IUsdPlusToken(token).rebaseOptIn(pool);
                emit RemoveItem(token, pool);
                return;
            }
        }

        revert('item not found');
    }

    /**
     * Remove items
     */
    function removeItems() external onlyUnit {
        uint256 length = items.length;
        for (uint256 x = 0; x < length; x++) {
            Item memory item = items[length - x - 1];
            items.pop();
            IUsdPlusToken(item.token).rebaseOptIn(item.pool);
        }
    }

    /**
     * This function executing in payout after increase/decrease liquidity index for USD+|DAI+|ETS tokens
     * see details: Exchange.sol | HedgeExchanger.sol
     */
    function payoutDone(address token, NonRebaseInfo [] memory nonRebaseInfo) external virtual override onlyExchanger {

        if (disabled) {
            revert('PayoutManager disabled');
        }

        for (uint256 i = 0; i < items.length; i++) {

            Item memory item = items[i];
            if (item.token != token) {
                continue;
            }

            for (uint256 j = 0; j < nonRebaseInfo.length; j++) {

                NonRebaseInfo memory info = nonRebaseInfo[j];
                if (item.pool != info.pool) {
                    continue;
                }

                if (item.operation == Operation.SKIM) {
                    _skim(info, item);
                } else if (item.operation == Operation.BRIBE){
                    _bribe(info, item);
                } else {
                    _custom(info, item);
                }
            }
        }


    }

    /**
    * Skim tokens from pool and transfer profit as bribes
    */

    function _bribe(NonRebaseInfo memory info, Item memory item) internal {

        uint256 amountToken = info.amount;
        IERC20 token = IERC20(item.token);
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

    function _skim(NonRebaseInfo memory info, Item memory item) internal {

        uint256 amountToken = info.amount;
        IERC20 token = IERC20(item.token);

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
      * Override this method for unique behavior smart-contracts.
      * If standard skim/sync/bribe not allow use.
      */

    function _custom(NonRebaseInfo memory info, Item memory item) internal virtual {
        revert("Custom not implemented");
    }


    uint256[49] private __gap;

}

interface IBribe {
    function notifyRewardAmount(address token, uint amount) external;
}
