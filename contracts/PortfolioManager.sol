// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "./interfaces/IPortfolioManager.sol";
import "./interfaces/IConnector.sol";
import "./interfaces/IMark2Market.sol";
import "./interfaces/IActionBuilder.sol";
import "./connectors/curve/interfaces/IRewardOnlyGauge.sol";
import "./registries/Portfolio.sol";

import "./Vault.sol";
import "./Balancer.sol";
import "./interfaces/IRewardManager.sol";
import "hardhat/console.sol";
contract PortfolioManager is IPortfolioManager, AccessControl {
    bytes32 public constant EXCHANGER = keccak256("EXCHANGER");

    // ---  fields

    Vault public vault;
    Balancer public balancer;
    address public exchanger;
    IRewardManager rewardManager;

    // ---  events

    //TODO: remove
    event ConsoleLog(string str);
    event Exchanged(uint256 amount, address from, address to);

    // ---  modifiers

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    modifier onlyExchanger() {
        require(hasRole(EXCHANGER, msg.sender), "Caller is not the EXCHANGER");
        _;
    }

    // ---  constructor

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // ---  setters

    function setExchanger(address _exchanger) public onlyAdmin {
        require(_exchanger != address(0), "Zero address not allowed");
        exchanger = _exchanger;
        grantRole(EXCHANGER, exchanger);
    }

    function setVault(address _vault) external onlyAdmin {
        require(_vault != address(0), "Zero address not allowed");
        vault = Vault(_vault);
    }

    function setBalancer(address _balancer) external onlyAdmin {
        require(_balancer != address(0), "Zero address not allowed");
        balancer = Balancer(_balancer);
    }

    function setRewardManager(address _rewardManager) external onlyAdmin {
        require(_rewardManager != address(0), "Zero address not allowed");
        rewardManager = IRewardManager(_rewardManager);
    }


    // ---  logic

    function deposit(IERC20 _token, uint256 _amount) external override onlyExchanger {
        // 1. put tokens into Vault
        _token.transfer(address(vault), _amount);

        // 2. start balancing
        balanceOnDeposit();
    }

    function balanceOnDeposit() internal {
         // 1. got action to balance
         IActionBuilder.ExchangeAction[] memory actionOrder = balancer.buildBalanceActions();

         // 2. execute them
         executeActions(actionOrder);
    }

    function withdraw(IERC20 _token, uint256 _amount)
    external
    override
    onlyExchanger
    returns (uint256)
    {
        // 0.1 TODO: check that _token is one off used
        // 0.2 TODO: check total balance would be in balancer where wi will correct total price, is enough?

        // 1. balance to needed amount
        balanceOnWithdraw(_token, _amount);

        // 2. transfer back tokens
        // TODO: transfer amount should be reduced by fees

        uint256 currentBalance = _token.balanceOf(address(vault));

        //TODO: crunch to get logs, remove
        if (_amount > currentBalance) {
            _amount = currentBalance;
        }

        if (currentBalance < _amount) {
            revert(string(
                abi.encodePacked(
                    "In vault not enough for transfer _amount: ",
                    uint2str(_token.balanceOf(address(vault))),
                    " < ",
                    uint2str(_amount)
                )
            ));
        }

        vault.transfer(_token, msg.sender, _amount);

        return _amount;
    }

    function balanceOnReward() external override onlyExchanger {
        balanceOnDeposit();
    }

    function balanceOnWithdraw(IERC20 _token, uint256 _amount) internal {
        // 1. got action to balance
        IActionBuilder.ExchangeAction[] memory actionOrder = balancer.buildBalanceActions(
            _token,
            _amount
        );

        // 2. execute them
        executeActions(actionOrder);
    }

    function executeActions(IActionBuilder.ExchangeAction[] memory actionOrder) internal {
console.log("executeActions: start\t%s", gasleft());

        bool someActionExecuted = true;
        while (someActionExecuted) {
            someActionExecuted = false;
            for (uint8 i = 0; i < actionOrder.length; i++) {
console.log("executeActions: new iteration\t%s", gasleft());
                IActionBuilder.ExchangeAction memory action = actionOrder[i];
                if (action.executed) {
                    // Skip already executed
                    continue;
                }
                uint256 amount = action.amount;
                uint256 denormalizedAmount;
                //TODO: denominator usage
                uint256 denominator = 10 ** (18 - IERC20Metadata(address(action.from)).decimals());
console.log("executeActions: denominators\t%s", gasleft());
                if (action.exchangeAll) {
                    denormalizedAmount = action.from.balanceOf(address(vault));
                    // normalize denormalizedAmount to 10**18
                    amount = denormalizedAmount * denominator;
                } else {
                    // denormalize amount from 10**18 to token decimals
                    denormalizedAmount = amount / denominator;
                }
console.log("executeActions: denormalizedAmount\t%s", gasleft());

                //TODO: recheck, may be denormalizedAmount should be checked
                if (amount == 0) {
                    // Skip zero amount action
                    continue;
                }

                if (action.from.balanceOf(address(vault)) < denormalizedAmount) {
                    // Skip not enough balance for execute know
                    continue;
                }
console.log("executeActions: balanceOf\t%s", gasleft());

                // move tokens to tokenExchange for executing action, amount - NOT normalized to 10**18
                vault.transfer(action.from, address(action.tokenExchange), denormalizedAmount);
console.log("executeActions: transfer\t%s", gasleft());
                // execute exchange
                action.tokenExchange.exchange(
                    address(vault),
                    action.from,
                    address(vault),
                    action.to,
                    amount
                );
                action.executed = true;
console.log("executeActions: tokenExchange.exchange\t%s", gasleft());

                emit Exchanged(amount, address(action.from), address(action.to));
console.log("executeActions: Exchanged\t%s", gasleft());

                someActionExecuted = true;
            }
        }
console.log("executeActions: end\t%s", gasleft());
    }

    /**
     * Claim rewards from Curve gauge where we have staked LP tokens
     */
    function claimRewards() external override {
        rewardManager.claimRewards();
    }


    //TODO: remove
    function uint2str(uint _i) internal pure returns (string memory _uintAsString) {
        if (_i == 0) {
            return "0";
        }
        uint j = _i;
        uint len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint k = len;
        while (_i != 0) {
            k = k - 1;
            bstr[k] = bytes1(uint8(48 + (_i % 10)));
            _i /= 10;
        }
        return string(bstr);
    }
}
