import contract from '@truffle/contract';

import Web3 from "web3";

import Exchange from '../contracts/Exchange.json';
import USDCtest from '../contracts/USDCtest.json';
import OverNightToken from '../contracts/OvernightToken.json';
import Mark2Market from '../contracts/Mark2Market.json';
import DAItest from '../contracts/DAItest.json'
import ActivesList from '../contracts/ActivesList.json';
import PortfolioManager from '../contracts/PortfolioManager.json';
import ConnectorAAVE from '../contracts/ConnectorAAVE.json';
import ConnectorCurve from '../contracts/ConnectorCurve.json';
import IMark2Market from '../contracts/IMark2Market.json';

import abiDecoder from "./abiDecoder";

const state = {
    web3: null,
    initComplete: null,
    contractNames: {},
    networkId: null,
};

async function _initWeb3() {

    const web3 = new Web3(window.ethereum);

    await window.ethereum.enable();

   let networkId = await web3.eth.net.getId();
   console.log('Network ID '+ networkId)
    state.networkId = networkId;

    web3.eth.getAccounts((error, accounts) => {
        _initContracts(web3, accounts);
    })

    window.ethereum.on('accountsChanged', function (accounts) {
        _initContracts(web3, accounts);
    });

    state.web3 = web3;

    return web3;
}


function _initContracts(web3, accounts, ) {
    let account = accounts[0];

    abiDecoder.setUtils(web3.utils);
    abiDecoder.setAbiDecoder(web3.eth.abi);

    let contracts = {};

    contracts.exchange = _load(Exchange, account, web3);
    contracts.usdc = _load(USDCtest, account, web3, '0x2791bca1f2de4661ed88a30c99a7a9449aa84174');
    contracts.dai = _load(DAItest, account, web3, '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063');
    contracts.ovn = _load(OverNightToken, account, web3);
    contracts.m2m = _load(Mark2Market, account, web3);
    contracts.pm = _load(PortfolioManager, account, web3);
    contracts.activesList = _load(ActivesList, account, web3);

    _load(ConnectorAAVE, account, web3, '0xd05e3E715d945B59290df0ae8eF85c1BdB684744')
    _load(ConnectorCurve, account, web3)
    _load(IMark2Market, account, web3)

    state.initComplete({
        account: account,
        contracts: contracts,
        contractNames: state.contractNames
    });
}


function _load(file, account, web3, address) {

    let contractConfig = contract(file);
    abiDecoder.addABI(file.abi);


    const {abi, networks, deployedBytecode} = contractConfig

    if (!address) {
        let network = networks[state.networkId];
        if (network)
            address = network.address
        else
            return;
    }

    state.contractNames[address] = contractConfig.contractName;

    return new web3.eth.Contract(abi, address);
}


export default {
    initWeb3: _initWeb3,
    web3: () => state.web3,
    initComplete: (call) => state.initComplete = call,
}
