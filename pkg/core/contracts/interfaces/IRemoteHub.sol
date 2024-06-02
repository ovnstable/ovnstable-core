// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./IUsdPlusToken.sol";
import "./IExchange.sol";
import "./IPayoutManager.sol";
import "./IRoleManager.sol";
import "./IRemoteHub.sol";


import "@overnight-contracts/market/contracts/interfaces/IWrappedUsdPlusToken.sol";
import "@overnight-contracts/market/contracts/interfaces/IMarket.sol";

struct ChainItem {
    uint64 chainSelector;
    address usdp;
    address exchange;
    address payoutManager;
    address roleManager;
    address remoteHub;
    address market;
    address wusdp;
    address ccipPool;
}

interface IRemoteHub {

    function execMultiPayout(uint256 newDelta) external;

    function chainSelector() external view returns(uint64);

    function getChainItemById(uint64 key) external view returns(ChainItem memory);



    function ccipPool() external view returns(address);

    function usdp() external view returns(IUsdPlusToken);

    function exchange() external view returns(IExchange);

    function payoutManager() external view returns(IPayoutManager);

    function roleManager() external view returns(IRoleManager);

    function remoteHub() external view returns(IRemoteHub);

    function wusdp() external view returns(IWrappedUsdPlusToken);

    function market() external view returns(IMarket);
}
