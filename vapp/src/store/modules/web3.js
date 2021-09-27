import detectEthereumProvider from "@metamask/detect-provider";
import Web3 from "web3";
import abiDecoder from "../../plugins/abiDecoder";
import Exchange from "../../contracts/Exchange.json";
import USDCtest from "../../contracts/USDCtest.json";
import DAItest from "../../contracts/DAItest.json";
import OverNightToken from "../../contracts/OvernightToken.json";
import Mark2Market from "../../contracts/Mark2Market.json";
import PortfolioManager from "../../contracts/PortfolioManager.json";
import ActivesList from "../../contracts/ActivesList.json";
import ConnectorAAVE from "../../contracts/ConnectorAAVE.json";
import ConnectorCurve from "../../contracts/ConnectorCurve.json";
import IMark2Market from "../../contracts/IMark2Market.json";
import contract from "@truffle/contract";
import {axios} from "../../plugins/http-axios";


const state = {
    contracts: null,
    account: null,
    web3: null,
    contractNames: {},
    networkId: null,
};

const getters = {


    web3(state) {
        return state.web3;
    },

    account(state) {
        return state.account;
    },

    contracts(state) {
        return state.contracts;
    },

    contractNames(state) {
        return state.contractNames;
    },

    networkId(state) {
        return state.networkId;
    },

};

const actions = {


    async connectWallet({commit, dispatch, getters}) {

        const provider = await detectEthereumProvider();
        await provider.enable();
    },


    async initWeb3({commit, dispatch, getters, rootState}) {

        let provider = await detectEthereumProvider();

        if (!provider) {
            provider = new Web3.providers.HttpProvider("https://polygon-mainnet.infura.io/v3/66f5eb50848f458cb0f0506cc1036fea");
        }

        provider = Web3RequestLogger(provider);
        let web3 = new Web3(provider);

        let networkId = await web3.eth.net.getId();
        console.log('Network ID ' + networkId)
        commit('setNetworkId', networkId)

        if (provider && provider.on) {
            provider.on('accountsChanged', function (accounts) {
                let account = accounts[0];
                dispatch('accountChange', account)
            });

            provider.on('networkChanged', function (networkId){
                networkId = parseInt(networkId)
                commit('setNetworkId', networkId)
                if (networkId === 137) {
                    dispatch('initPolygonData');
                }else {
                    dispatch('profile/resetUserData', null, {root: true})
                }


            });
        }

        abiDecoder.setUtils(web3.utils);
        abiDecoder.setAbiDecoder(web3.eth.abi);

        console.log('Web3 init completed!')
        commit('setWeb3', web3);

        if (networkId === 137) {
            dispatch('initPolygonData');
        }

    },

    async accountChange({commit, dispatch, getters, rootState}, account) {

        commit('setAccount', account);
        if (account) {
            dispatch('profile/refreshUserData', null, {root: true})
        } else {
            dispatch('profile/resetUserData', null, {root: true})
        }
    },

    async initContracts({commit, dispatch, getters}) {

        let web3 = getters.web3;

        let contracts = {};

        contracts.exchange = _load(Exchange, web3);
        contracts.usdc = _load(USDCtest, web3, '0x2791bca1f2de4661ed88a30c99a7a9449aa84174');
        contracts.dai = _load(DAItest, web3, '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063');
        contracts.ovn = _load(OverNightToken, web3);
        contracts.m2m = _load(Mark2Market, web3);
        contracts.pm = _load(PortfolioManager, web3);
        contracts.activesList = _load(ActivesList, web3);

        _load(ConnectorAAVE, web3, '0xd05e3E715d945B59290df0ae8eF85c1BdB684744')
        _load(ConnectorCurve, web3)
        _load(IMark2Market, web3)

        commit('setContracts', contracts)
    },


    async initPolygonData({commit, dispatch, getters, rootState}) {
        dispatch('initContracts');
        dispatch('profile/refreshNotUserData', null, {root: true})

        await getters.web3.eth.getAccounts((error, accounts) => {
            let account = accounts[0];
            dispatch('accountChange', account)
        })
    },

    async setNetwork({commit, dispatch, getters, rootState}, networkId) {

        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{chainId: getters.web3.utils.toHex(networkId)}], // chainId must be in hexadecimal numbers
        });

        let newNetworkId = await getters.web3.eth.net.getId();
        if (newNetworkId === 137) {
            commit('setNetworkId', newNetworkId)
            dispatch('initPolygonData')
        }

    },


};

const mutations = {

    setWeb3(state, web3) {
        state.web3 = web3;
    },

    setContracts(state, contracts) {
        state.contracts = contracts;
    },

    setAccount(state, account) {
        state.account = account;
    },

    setNetworkId(state, value) {
        state.networkId = value;
    },


};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
};


function _load(file, web3, address) {

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

function Web3RequestLogger(httpProvider) {
    let handler = {
        get(target, propKey, receiver) {
            const origMethod = Reflect.get(target, propKey, receiver);
            if (propKey === "send") {
                return function (...args) {
                    console.log(`Sent JSONRPC Request: ${JSON.stringify(args[0])}`);
                    let responseCallback = function (err, result) {
                        console.log(`Received JSONRPC Response: ${JSON.stringify(result)}`)
                        args[1](err, result)
                    };
                    return origMethod.apply(this, [args[0], responseCallback]);
                };
            }
            return origMethod;
        }
    };
    return new Proxy(httpProvider, handler);
}
