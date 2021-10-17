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
import "./registries/InvestmentPortfolio.sol";

import "./Vault.sol";
import "./Balancer.sol";

contract PortfolioManager is IPortfolioManager, AccessControl {
    bytes32 public constant EXCHANGER = keccak256("EXCHANGER");

    // ---  fields

    Vault vault;
    Balancer balancer;
    address exchanger;
    IRewardOnlyGauge rewardGauge;

    // ---  events

    //TODO: remove
    event ConsoleLog(string str);

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

    function setRewardGauge(address _rewardGauge) external onlyAdmin {
        require(_rewardGauge != address(0), "Zero address not allowed");
        rewardGauge = IRewardOnlyGauge(_rewardGauge);
    }

    // ---  logic

    //TODO: exchange only
    function invest(IERC20 _token, uint256 _amount) external override onlyExchanger {
        // 1. put tokens into Vault
        _token.transfer(address(vault), _amount);

        // 2. start balancing
        balanceOnInvest();
    }

    function balanceOnInvest() internal {
        try balancer.buildBalanceActions() returns (
            IActionBuilder.ExchangeAction[] memory actionOrder
        ) {
            //TODO: remove
            emit ConsoleLog(string(abi.encodePacked(uint2str(actionOrder.length), " actions")));

            // 2. execute them
            executeActions(actionOrder);
        } catch Error(string memory reason) {
            // This may occur if there is an overflow with the two numbers and the `AddNumbers` contract explicitly fails with a `revert()`
            emit ConsoleLog(reason);
            revert(reason);
        } catch {
            emit ConsoleLog("balanceOnInvest:buildBalanceActions: No reason");
            revert("balanceOnInvest:buildBalanceActions: No reason");
        }

        // // 1. got action to balance
        // IActionBuilder.ExchangeAction[] memory actionOrder = balancer.buildBalanceActions();
        // //TODO: remove
        // emit ConsoleLog(string(abi.encodePacked(uint2str(actionOrder.length), " actions")));

        // // 2. execute them
        // executeActions(actionOrder);
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

        //TODO: crunch to get logs, remove
        uint256 currentBalance = _token.balanceOf(address(vault));
        if (_amount > currentBalance) {
            _amount = currentBalance;
        }

        require(
            _token.balanceOf(address(vault)) >= _amount,
            string(
                abi.encodePacked(
                    "In vault not enough for transfer _amount: ",
                    uint2str(_token.balanceOf(address(vault))),
                    " < ",
                    uint2str(_amount)
                )
            )
        );
        vault.transfer(_token, msg.sender, _amount);

        return _amount;
    }

    function balanceOnReward() external override onlyExchanger {
        balanceOnInvest();
    }

    function balanceOnWithdraw(IERC20 _token, uint256 _amount) internal {
        // 1. got action to balance
        // try balancer.buildBalanceActions(_token, _amount) returns (
        //     IActionBuilder.ExchangeAction[] memory actionOrder
        // ) {
        //     //TODO: remove
        //     emit ConsoleLog(string(abi.encodePacked(uint2str(actionOrder.length), " actions")));

        //     // 2. execute them
        //     executeActions(actionOrder);
        // } catch Error(string memory reason) {
        //     // This may occur if there is an overflow with the two numbers and the `AddNumbers` contract explicitly fails with a `revert()`
        //     emit ConsoleLog(reason);
        //     revert(reason);
        // } catch {
        //     emit ConsoleLog("buildBalanceActions: No reason");
        //     revert("buildBalanceActions: No reason");
        // }

        IActionBuilder.ExchangeAction[] memory actionOrder = balancer.buildBalanceActions(
            _token,
            _amount
        );
        //TODO: remove
        emit ConsoleLog(string(abi.encodePacked(uint2str(actionOrder.length), " actions")));

        // 2. execute them
        executeActions(actionOrder);
    }

    function executeActions(IActionBuilder.ExchangeAction[] memory actionOrder) internal {
        //TODO: remove
        emit ConsoleLog(
            string(abi.encodePacked(uint2str(actionOrder.length), " actions to execute"))
        );

        bool someActionExecuted = true;
        while (someActionExecuted) {
            someActionExecuted = false;
            for (uint8 i = 0; i < actionOrder.length; i++) {
                IActionBuilder.ExchangeAction memory action = actionOrder[i];
                if (action.executed) {
                    // Skip executed
                    //TODO: remove
                    emit ConsoleLog(
                        string(
                            abi.encodePacked(
                                uint2str(i),
                                " Skip executed: ",
                                uint2str(action.amount),
                                " from ",
                                toAsciiString(address(action.from)),
                                " to ",
                                toAsciiString(address(action.to))
                            )
                        )
                    );
                    continue;
                }
                uint256 amount = action.amount;
                uint256 denormalizedAmount;
                //TODO: denominator usage
                uint256 denominator = 10**(18 - IERC20Metadata(address(action.from)).decimals());
                if (action.exchangeAll) {
                    denormalizedAmount = action.from.balanceOf(address(vault));
                    // normalize denormalizedAmount to 10**18
                    amount = denormalizedAmount * denominator;
                } else {
                    // denormalize amount from 10**18 to token decimals
                    denormalizedAmount = amount / denominator;
                }
                if (amount == 0) {
                    // Skip zero amount action
                    //TODO: remove
                    emit ConsoleLog(
                        string(
                            abi.encodePacked(
                                uint2str(i),
                                " Skip zero amount action: ",
                                uint2str(amount),
                                " from ",
                                toAsciiString(address(action.from)),
                                " to ",
                                toAsciiString(address(action.to))
                            )
                        )
                    );
                    continue;
                }

                if (action.from.balanceOf(address(vault)) < denormalizedAmount) {
                    // Skip not enough blance for execute know
                    //TODO: remove
                    emit ConsoleLog(
                        string(
                            abi.encodePacked(
                                uint2str(i),
                                " Skip not enough balance for execute know: ",
                                uint2str(denormalizedAmount),
                                " from ",
                                toAsciiString(address(action.from)),
                                " to ",
                                toAsciiString(address(action.to)),
                                " current ",
                                uint2str(action.from.balanceOf(address(vault)))
                            )
                        )
                    );
                    continue;
                }

                // move tokens to tokenExchange for executing action, amount - NOT normalized to 10**18
                vault.transfer(action.from, address(action.tokenExchange), denormalizedAmount);
                // execute exchange
                try
                    action.tokenExchange.exchange(
                        address(vault),
                        action.from,
                        address(vault),
                        action.to,
                        amount
                    )
                {
                    action.executed = true;
                    //TODO: remove
                    emit ConsoleLog(
                        string(
                            abi.encodePacked(
                                uint2str(i),
                                " Exchange ",
                                uint2str(amount),
                                " -> ",
                                uint2str(denormalizedAmount),
                                " from ",
                                toAsciiString(address(action.from)),
                                " to ",
                                toAsciiString(address(action.to))
                            )
                        )
                    );
                } catch Error(string memory reason) {
                    revert(
                        string(
                            abi.encodePacked(
                                reason,
                                "\n+ action.tokenExchange.exchange: ",
                                uint2str(amount),
                                " from ",
                                toAsciiString(address(action.from)),
                                " to ",
                                toAsciiString(address(action.to))
                            )
                        )
                    );
                } catch {
                    revert(
                        string(
                            abi.encodePacked(
                                "action.tokenExchange.exchange: No reason ",
                                uint2str(amount),
                                " from ",
                                toAsciiString(address(action.from)),
                                " to ",
                                toAsciiString(address(action.to))
                            )
                        )
                    );
                }

                // action.tokenExchange.exchange(
                //     address(vault),
                //     action.from,
                //     address(vault),
                //     action.to,
                //     amount
                // );
                // action.executed = true;
                //TODO: remove
                emit ConsoleLog(
                    string(
                        abi.encodePacked(
                            "Exchange ",
                            uint2str(amount),
                            " from ",
                            toAsciiString(address(action.from)),
                            " to ",
                            toAsciiString(address(action.to))
                        )
                    )
                );
                someActionExecuted = true;
            }
        }
    }

    /**
     * Claim rewards from Curve gauge where we have staked LP tokens
     */
    function claimRewards() external override {
        //TODO: add event if gauge emit nothing
        rewardGauge.claim_rewards(address(vault));
    }

    //TODO: remove
    function toAsciiString(address x) internal pure returns (string memory) {
        bytes memory s = new bytes(40);
        for (uint i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint(uint160(x)) / (2**(8 * (19 - i)))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            s[2 * i] = char(hi);
            s[2 * i + 1] = char(lo);
        }
        return string(s);
    }

    //TODO: remove
    function char(bytes1 b) internal pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
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
