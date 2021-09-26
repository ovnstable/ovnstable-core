// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IPortfolioManager.sol";
import "./interfaces/IConnector.sol";
import "./interfaces/IMark2Market.sol";
import "./interfaces/IActionBuilder.sol";
import "./registries/InvestmentPortfolio.sol";

import "./OwnableExt.sol";
import "./Vault.sol";
import "./Balancer.sol";

//TODO: use AccessControl or Ownable from zeppelin
contract PortfolioManager is IPortfolioManager, OwnableExt {
    Vault vault;
    Balancer balancer;

    event ConsoleLog(string str);

    function setVault(address _vault) external onlyOwner {
        require(_vault != address(0), "Zero address not allowed");
        vault = Vault(_vault);
    }

    function setBalancer(address _balancer) external onlyOwner {
        require(_balancer != address(0), "Zero address not allowed");
        balancer = Balancer(_balancer);
    }

    function initActionBuilders() external onlyOwner {}

    //TODO: exchange only
    function invest(IERC20 _token, uint256 _amount) external override {
        // 1. put tokens into Vault
        _token.transfer(address(vault), _amount);

        // 2. start balancing
        balanceOnInvest();
    }

    function balanceOnInvest() private {
        // 1. got action to balance
        IActionBuilder.ExchangeAction[] memory actionOrder = balancer.balanceActions();
        emit ConsoleLog(string(abi.encodePacked(uint2str(actionOrder.length), " actions")));

        // 2. execute them
        executeActions(actionOrder);
    }

    //TODO: exchange only
    function withdraw(IERC20 _token, uint256 _amount) external override returns (uint256) {
        // 0.1 TODO: check that _token is one off used
        // 0.2 TODO: check total balance would be in balancer where wi will correct total price, is enough?

        // 1. balance to needed amount
        balanceOnWithdraw(_token, _amount);

        // 2. transfer back tokens
        // TODO: transfer amount should be without fees
        vault.transfer(_token, msg.sender, _amount);

        return _amount;
    }

    function balanceOnWithdraw(IERC20 _token, uint256 _amount) private {
        // 1. got action to balance
        IActionBuilder.ExchangeAction[] memory actionOrder = balancer.balanceActions(
            _token,
            _amount
        );
        emit ConsoleLog(string(abi.encodePacked(uint2str(actionOrder.length), " actions")));

        // 2. execute them
        executeActions(actionOrder);
    }

    function executeActions(IActionBuilder.ExchangeAction[] memory actionOrder) private {
        emit ConsoleLog(string(abi.encodePacked(uint2str(actionOrder.length), " actions")));

        bool someActionExecuted = true;
        while (someActionExecuted) {
            someActionExecuted = false;
            for (uint8 i = 0; i < actionOrder.length; i++) {
                IActionBuilder.ExchangeAction memory action = actionOrder[i];
                if (action.executed) {
                    // Skip executed
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
                if (action.amount == 0) {
                    // Skip zero amount action
                    emit ConsoleLog(
                        string(
                            abi.encodePacked(
                                uint2str(i),
                                " Skip zero amount action: ",
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
                if (action.from.balanceOf(address(vault)) < action.amount) {
                    // Skip not enough blance for execute know
                    emit ConsoleLog(
                        string(
                            abi.encodePacked(
                                uint2str(i),
                                " Skip not enough blance for execute know: ",
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
                // move tokens to tokenExchange for executing action
                vault.transfer(action.from, address(action.tokenExchange), action.amount);
                // execute exchange
                action.tokenExchange.exchange(
                    address(vault),
                    action.from,
                    address(vault),
                    action.to,
                    action.amount
                );
                action.executed = true;
                emit ConsoleLog(
                    string(
                        abi.encodePacked(
                            "Exchange ",
                            uint2str(action.amount),
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

    function char(bytes1 b) internal pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }

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
