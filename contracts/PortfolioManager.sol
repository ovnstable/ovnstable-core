// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

/// @title Common inrterface to DeFi protocol connectors
/// @author @Stanta
/// @notice Every connector have to implement this function
/// @dev Choosing of connector releasing by changing address of connector's contract

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IPortfolioManager.sol";
import "./interfaces/IActivesList.sol";
import "./interfaces/IConnector.sol";
import "./interfaces/IMark2Market.sol";
import "./interfaces/IActionBuilder.sol";
import "./registries/InvestmentPortfolio.sol";

import "./OwnableExt.sol";
import "./Vault.sol";
import "./Balancer.sol";

contract PortfolioManager is IPortfolioManager, OwnableExt {
    IActivesList actList;

    Vault vault;
    Balancer balancer;

    event ConsoleLog(string str);

    event ConsoleLogNamed(string label, int256 num);
    event ConsoleLogNamed(string label, uint256 num);
    event ConsoleLogNamed(string label, string str);
    event ConsoleLogNamed(string label, address addr);

    function setAddr(address _addrAL) external onlyOwner {
        actList = IActivesList(_addrAL);
    }

    function setVault(address _vault) external onlyOwner {
        vault = Vault(_vault);
    }

    function setBalancer(address _balancer) external onlyOwner {
        balancer = Balancer(_balancer);
    }

    function initActionBuilders() external onlyOwner {}

    function invest(IERC20 _token, uint256 _amount) external {
        // 1. put tokens into Vault
        _token.transfer(address(vault), _amount);

        // 2. start balancing
        balanceOnInvest();
    }

    function balanceOnInvest() public {
        // 1. got action to balance
        IActionBuilder.ExchangeAction[] memory actionOrder = balancer.balanceActions();
        emit ConsoleLog(string(abi.encodePacked(uint2str(actionOrder.length), " actions")));

        // 2. execute them
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

    function toAsciiString(address x) internal view returns (string memory) {
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

    function char(bytes1 b) internal view returns (bytes1 c) {
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

    // function rebalanceOnInvest() public {
    //     // 1. get current prices from M2M
    //     ActivesPrices[] activePrices = m2m.activesPrices();

    //     // 2. calc total price
    //     uint256 totalUsdcPrice = 0;
    //     for (uint8 i = 0; i < actives.length; i++) {
    //         totalUsdcPrice += activePrices[i].price;
    //     }

    //     // // 3. calc weight of each active in total
    //     // for (uint8 i = 0; i < actives.length; i++) {
    //     //     // here we lose some precision but it doesn't affect out work
    //     //     // NOTE: if it would be moved to M2M and could be used in fronts then
    //     //     //       need to correct losses to get 100% at total
    //     //     activePrices[i].weightInTotal = (TOTAL_WEIGHT * activePrices[i].price) / totalUsdcPrice;
    //     // }

    //     // 4. get action what to do:
    //     //      1 - do nothing
    //     //      2 - invest with some amount of tokens
    //     //      3 - withdraw with some amount of tokens
    //     Action[] actions = new Action[actives.length];
    //     for (uint8 i = 0; i < actives.length; i++) {
    //         Active active = new Active();
    //         ActiveInfo activeInfo = new ActiveInfo();
    //         ActivePrice activePrice = activePrices[i];
    //         uint256 currentPrice = activePrice.price;
    //         uint256 targetPrice = (totalUsdcPrice * active.targetWeight) / TOTAL_WEIGHT;
    //         uint256 minPrice = (totalUsdcPrice * active.minWeight) / TOTAL_WEIGHT;
    //         uint256 maxPrice = (totalUsdcPrice * active.maxWeight) / TOTAL_WEIGHT;

    //         if (currentPrice < minPrice) {
    //             // here we always know that targetPrice is higher than currentPrice
    //             uint256 difference = targetPrice - currentPrice;
    //             actions.push(new Action(3, difference));
    //         } else if (maxPrice < currentPrice) {
    //             // here we always know that currentPrice is higher than targetPrice
    //             uint256 difference = currentPrice - targetPrice;
    //             actions.push(new Action(2, difference));
    //         } else {
    //             actions.push(new Action(1, 0));
    //         }
    //     }

    //     // 5. do the things
    //     for (uint8 i = 0; i < actives.length; i++) {
    //         ActiveInfo activeInfo = new ActiveInfo();
    //         doAction(activeInfo, actions[i]);
    //     }
    // }

    // function withdraw(IERC20 _token, uint256 _amount) {
    //     // 0. TODO: check that _token is one off used

    //     // 1. get current prices from M2M
    //     ActivesPrices[] activePrices = m2m.activesPricess();

    //     // 2. calc total price
    //     uint256 totalUsdcPrice = 0;
    //     for (uint8 i = 0; i < actives.length; i++) {
    //         totalUsdcPrice += activePrices[i].price;
    //     }

    //     address tokenAddress = address(_token);
    //     uint256 currentUsdcBalanceAtVault = 0;
    //     for (uint8 i = 0; i < actives.length; i++) {
    //         if (tokenAddress == activePrices[i].asset) {
    //             // calc diff for
    //             currentUsdcBalanceAtVault = activePrices[i].price;
    //         }
    //     }
    //     // total sum of other tokens - need to calc target
    //     uint256 otherTokensTotalUsdcPrice = totalUsdcPrice - currentUsdcBalanceAtVault;

    //     required(totalUsdcPrice >= _amount);
    //     // new total sum without withdrawed amount - need to calc target
    //     uint256 newTotalUsdcPrice = totalUsdcPrice - _amount;

    // }

    function stake(address _asset, uint256 _amount) external override {
        // 1. get actives data from active list
        IActivesList.Active memory active = actList.getActive(_asset);
        IActivesList.Active memory active2 = actList.getActive(active.derivatives[0]);
        //todo choosing active based on strategy
        uint256 bal2 = IERC20(active2.actAddress).balanceOf(address(this));
        // 2. sent liquidity to connector
        // require(IERC20(_asset).balanceOf(address(this)) >= _amount, "Not enough balance on PM");

        // emit ConsoleLogNamed("Before stake USDC ", IERC20(_asset).balanceOf(address(this)));
        // emit ConsoleLogNamed("Before stake aUSDC ", IERC20(active.aTokenAddress).balanceOf(address(this)));
        // 3. stake
        // 3.1 act1
        // IERC20(_asset).transfer(active.connector, (_amount * 2) / 3);

        uint toAaveAmount = _amount / 2;
        IERC20(_asset).transfer(active.connector, toAaveAmount);

        // emit ConsoleLogNamed("Before stake USDC on Connector", IERC20(_asset).balanceOf(active.connector));
        // emit ConsoleLogNamed("Before stake aUSDC on Connector", IERC20(active.aTokenAddress).balanceOf(active.connector));

        IConnector(active.connector).stake(_asset, active.poolStake, toAaveAmount, address(this));
        // 3.2 act2
        // bal2 = IERC20(active2.actAddress).balanceOf(address(this)) - bal2;

        // IERC20(active2.actAddress).transfer(active2.connector, bal2 / 2);

        // IConnector(active2.connector).stake(
        //     active2.actAddress,
        //     active2.poolStake,
        //     bal2 / 2,
        //     address(this)
        // );
    }

    function unstake(address _asset, uint256 _amount) external override returns (uint256) {
        // 1. get actives data from active list
        IActivesList.Active memory active = actList.getActive(_asset);
        // IActivesList.Active memory der1 = actList.getActive(active.derivatives[1]);
        IActivesList.Active memory der0 = actList.getActive(active.derivatives[0]);

        //  calculate needing amount of asset to remove
        //uint balDer0 = IERC20(der0.actAddress).balanceOf(address(this));
        //        uint256 withdrAmount = _amount / 2; //* balDer0 / active.balance;

        uint256 withdrawInAUsdc = _amount / 2;

        // unstake derivatives
        // IERC20(der1.actAddress).transfer(
        //     der1.connector,
        //     IERC20(der1.actAddress).balanceOf(address(this))
        // );
        // withdrAmount = IConnector(der1.connector).unstake(
        //     active.derivatives[0], //derivatives[i],
        //     der1.poolStake,
        //     _amount / 3,
        //     address(this)
        // );

        IERC20(der0.actAddress).transfer(
            active.connector,
            withdrawInAUsdc
            //            IERC20(der0.actAddress).balanceOf(address(this))
        );
        withdrawInAUsdc = IConnector(active.connector).unstake(
            active.actAddress, //derivatives[i],
            active.poolStake,
            withdrawInAUsdc,
            address(this)
        );
        // 2. unstake

        // emit ConsoleLogNamed("try unstake", _amount);

        // emit ConsoleLogNamed("Before unstake USDC ", IERC20(_asset).balanceOf(address(this)));
        // emit ConsoleLogNamed("Before unstake aUSDC ", IERC20(active.aTokenAddress).balanceOf(address(this)));

        // require(IERC20(active.aTokenAddress).balanceOf(address(this)) >= _amount, "Not enough balance aToken on PM");
        // uint256 unstackedAmount;

        /*   for (uint i=active.derivatives.length -1; i>=0 ; i--)
        {       //todo calculate withdrAmount depends on strategy
                // uint balAct1 = IERC20(_asset).balanceOf(address(this)) ;
                // uint balAct2 = IERC20(active.derivatives[i]).balanceOf(address(this));

                // uint withdrAmount = _amount * balAct2 / balAct1;

                IERC20(active.derivatives[i]).transfer(active.connector, withdrAmount);

                // emit ConsoleLogNamed("Before unstake USDC on Connector", IERC20(_asset).balanceOf(active.connector));
                // emit ConsoleLogNamed("Before unstake aUSDC on Connector", IERC20(active.aTokenAddress).balanceOf(active.connector));
                 withdrAmount = IConnector(active.connector).unstake(
                    active.actAddress, //derivatives[i],
                    active.poolStake,
                    withdrAmount,
                    address(this));
                // unstackedAmount =  unstackedAmount + withdrAmount;


                // emit ConsoleLogNamed("Unstacked", unstackedAmount);
                // emit ConsoleLogNamed("After unstake USDC ", IERC20(_asset).balanceOf(address(this)));
                // emit ConsoleLogNamed("After unstake aUSDC ", IERC20(active.aTokenAddress).balanceOf(address(this)));

        } */

        //3. transfer balance to calles
        IERC20(_asset).transfer(msg.sender, _amount);
        return _amount;
    }
}
