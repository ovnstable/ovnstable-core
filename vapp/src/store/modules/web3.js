import detectEthereumProvider from "@metamask/detect-provider";
import Web3 from "web3";
import abiDecoder from "../../plugins/abiDecoder";
import Exchange from "../../contracts/Exchange.json";
import ERC20 from "../../contracts/ERC20.json";
import OvnToken from "../../contracts/OvnToken.json";
import Governor from "../../contracts/OvnGovernor.json";
import Portfolio from "../../contracts/Portfolio.json";
import Mark2Market from "../../contracts/Mark2Market.json";
import TimelockController from "../../contracts/TimelockController.json";
import UsdPlusToken from "../../contracts/UsdPlusToken.json";
import contract from "@truffle/contract";

import OvnImage from '../../assets/ovn.json';
import UsdPlusImage from '../../assets/usdPlus.json';

const state = {
    contracts: null,
    account: null,
    web3: null,
    contractNames: {},
    networkId: null,
    switchToPolygon: false,
    loadingWeb3: true,
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

    switchToPolygon(state) {
        return state.switchToPolygon;
    },

    loadingWeb3(state) {
        return state.loadingWeb3;
    },

};

const actions = {


    async connectWallet({commit, dispatch, getters}) {

        const provider = await detectEthereumProvider();
        await provider.enable();
    },


    async initWeb3({commit, dispatch, getters, rootState}) {
        commit('setLoadingWeb3', true);

        let provider = await detectEthereumProvider();

        if (!provider) {
            provider = await new Web3.providers.HttpProvider("https://polygon-mainnet.infura.io/v3/66f5eb50848f458cb0f0506cc1036fea");
        }

        console.log('Provider ' + provider)
        let web3 = await new Web3(provider);

        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 sec

        let networkId = await web3.eth.net.getId();
        console.log('Network ID ' + networkId)
        commit('setNetworkId', networkId)

        if (window.ethereum) {
            let provider = window.ethereum;
            provider.on('accountsChanged', function (accounts) {
                let account = accounts[0];
                dispatch('accountChange', account)
            });

            provider.on('networkChanged', function (networkId) {
                networkId = parseInt(networkId)
                commit('setNetworkId', networkId)
                if (networkId === 137 || networkId === 31337) {
                    dispatch('initPolygonData');
                } else {
                    dispatch('profile/resetUserData', null, {root: true})
                    commit('setSwitchToPolygon', true)
                }

            });
        }

        abiDecoder.setUtils(web3.utils);
        abiDecoder.setAbiDecoder(web3.eth.abi);

        console.log('Web3 init completed!')
        commit('setWeb3', web3);

        dispatch('initContracts');
        dispatch('profile/refreshNotUserData', null, {root: true})
        dispatch('gasPrice/refreshGasPrice', null, {root: true})

        if (networkId === 137 || networkId === 31337) {
            dispatch('initPolygonData');
        }else {
            commit('setSwitchToPolygon', true)
        }


        commit('setLoadingWeb3', false);
    },

    async accountChange({commit, dispatch, getters, rootState}, account) {

        commit('setAccount', account);
        if (account) {
            dispatch('profile/refreshUserData', null, {root: true})
            dispatch('transaction/loadTransaction', null, {root: true})
        } else {
            dispatch('profile/resetUserData', null, {root: true})
        }
    },

    async initContracts({commit, dispatch, getters}) {

        let web3 = getters.web3;

        let contracts = {};

        contracts.exchange = _load(Exchange, web3);
        contracts.usdc = _load(ERC20, web3, '0x2791bca1f2de4661ed88a30c99a7a9449aa84174');
        contracts.dai = _load(ERC20, web3, '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063');
        contracts.govToken = _load(OvnToken, web3);
        contracts.governor = _load(Governor, web3);
        contracts.mark2market = _load(Mark2Market, web3);
        contracts.portfolio = _load(Portfolio, web3);
        contracts.timelockController= _load(TimelockController, web3);
        contracts.usdPlus = _load(UsdPlusToken, web3);

        commit('setContracts', contracts)
    },


    async initPolygonData({commit, dispatch, getters, rootState}) {
        commit('setSwitchToPolygon', false)
        await getters.web3.eth.getAccounts((error, accounts) => {
            let account = accounts[0];
            dispatch('accountChange', account)
        })
    },

    async setNetwork({commit, dispatch, getters, rootState}, networkId) {

        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{chainId: getters.web3.utils.toHex(networkId)}], // chainId must be in hexadecimal numbers
            });
        } catch (switchError) {
            // This error code indicates that the chain has not been added to MetaMask.
            if (switchError.code === 4902) {
                try {

                    let params = {
                        chainId: getters.web3.utils.toHex(137),
                        rpcUrls: ['https://polygon-rpc.com/'],
                        blockExplorerUrls: ['https://polygonscan.com/'],
                        chainName: 'Polygon Mainnet',
                        nativeCurrency: {
                            symbol: 'MATIC',
                            name: 'MATIC',
                            decimals: 18,
                        }
                    };

                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [params],
                    });
                } catch (addError) {

                }
            }
        }

        let newNetworkId = await getters.web3.eth.net.getId();

        if (newNetworkId === 137) {
            commit('setNetworkId', newNetworkId)
            dispatch('initPolygonData')
        }else {
            commit('setSwitchToPolygon', true)
        }

    },

    async addUsdPlusToken({commit, dispatch, getters, rootState}) {

        await window.ethereum
            .request({
                method: 'wallet_watchAsset',
                params: {
                    type: 'ERC20',
                    options: {
                        address: rootState.web3.contracts.usdPlus.options.address,
                        symbol: 'USD+',
                        decimals: 6,
                        image: UsdPlusImage.image,
                    },
                },
            })
            .then((success) => {
                if (success) {
                    console.log('USD+ successfully added to wallet!')
                } else {
                    throw new Error('Something went wrong.')
                }
            })
            .catch(console.error)

    },

    async addOvnToken({commit, dispatch, getters, rootState}) {

        await window.ethereum
            .request({
                method: 'wallet_watchAsset',
                params: {
                    type: 'ERC20',
                    options: {
                        address: rootState.web3.contracts.govToken.options.address,
                        symbol: 'OVN',
                        decimals: 18,
                        image: OvnImage.image,
                    },
                },
            })
            .then((success) => {
                if (success) {
                    console.log('OVN successfully added to wallet!')
                } else {
                    throw new Error('Something went wrong.')
                }
            })
            .catch(console.error)

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

    setSwitchToPolygon(state, value) {
        state.switchToPolygon= value;
    },

    setLoadingWeb3(state, value) {
        state.loadingWeb3 = value;
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


    const {abi} = contractConfig

    if (!address) {
       address = file.address;
    }

    state.contractNames[address] = contractConfig.contractName;

    return new web3.eth.Contract(abi, address);
}

