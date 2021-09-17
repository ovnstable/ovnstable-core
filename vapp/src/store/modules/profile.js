let accounting = require("accounting-js")
import {axios} from "../../plugins/http-axios";
import utils from "../../plugins/utils";
import abiDecoder from "../../plugins/abiDecoder";
let accountingConfig = {
    symbol: "",
    precision: 6,
    thousand: " ",
};


const state = {
    contracts: null,
    account: null,
    web3: null,


    currentTotalData: null,

    totalOvn: {
        totalMint: 0,
        totalBurn: 0,
        totalSupply: 0,
    },

    balance: {
        ovn: 0,
        usdc: 0,
    },

    gasPrice: 0,

    contractNames: {},

    transactionLogs: [],
};

const getters = {


    contracts(state) {
        return state.contracts;
    },
    account(state) {
        return state.account;
    },

    balance(state) {
        return state.balance;
    },

    currentTotalData(state) {
        return state.currentTotalData;
    },

    web3(state) {
        return state.web3;
    },

    contractNames(state) {
        return state.contractNames;
    },

    gasPrice(state) {
        return state.gasPrice;
    },

    totalOvn(state) {
        return state.totalOvn;
    },

    transactionLogs(state) {
        return state.transactionLogs;
    },

};

const actions = {


    async refreshBalance({commit, dispatch, getters}) {

        let usdc = await getters.contracts.usdc.methods.balanceOf(getters.account).call();
        let ovn = await getters.contracts.ovn.methods.balanceOf(getters.account).call();

        ovn = ovn / 10 ** 6;
        usdc = usdc / 10 ** 6;
        commit('setBalance', {
            ovn: ovn,
            usdc: usdc
        })

    },

    async refreshTransactionLogs({commit, dispatch, getters}) {

        let exchange = getters.contracts.exchange.options.address;
        let account = getters.account.toLowerCase();
        let token = 'YZPR4G2H7JSIIPXI5NTWN5G1HDX43GSUCR';

        axios.get(`https://api.polygonscan.com/api?module=account&action=txlist&address=${exchange}&startblock=1&endblock=99999999&sort=asc&apikey=${token}`)
            .then(value => {

                let items = value.data.result.filter(item => {
                    return item.from === account || item.to === account
                });


                let result = [];
                let id = 1;
                for (let item of items) {

                    let log = {
                        date: new Date(item.timeStamp*1000),
                        id: id,
                    }

                    let method = abiDecoder.decodeMethod(item.input);

                    let sum;
                    let contract;
                    switch (method.name){
                        case 'buy':
                            sum = method.params[1].value / 10 ** 6;
                            contract = utils.getContractNameByAddress(method.params[0].value)
                            log.name = `${contract} Minting for ${sum} OVN`;
                            log.sum = sum;
                            result.push(log)
                            break
                        case 'redeem':
                            sum = method.params[1].value / 10 ** 6;
                            contract = utils.getContractNameByAddress(method.params[0].value)
                            log.name = `OVN Redeemed for ${sum} ${contract}`;
                            log.sum = sum;
                            result.push(log)
                            break

                    }

                    id++;
                }

                result.sort(function(a,b){
                    return new Date(b.date) - new Date(a.date);
                });

                commit('setTransactionLogs', result)
            })

    },


    async refreshTotalOvn({commit, dispatch, getters}) {

        axios.get('/total').then(value => {
            commit('setTotalOvn', value.data);
        })

    },


    async refreshProfile({commit, dispatch, getters}) {

        dispatch('refreshGasPrice');
        dispatch('refreshCurrentTotalData');
        dispatch('refreshBalance');
        dispatch('refreshTotalOvn');
        dispatch('refreshTransactionLogs');
    },

    async refreshGasPrice({commit, dispatch, getters}) {
        getters.web3.eth.getGasPrice(function (e, r) {
            commit('setGasPrice', r)
        })
    },

    async refreshCurrentTotalData({commit, dispatch, getters}) {

        getters.contracts.m2m.methods.activesPrices().call().then(value => {
            console.log(value)

            let data = [];
            for (let i = 0; i < value.length; i++) {
                let element = value[i];

                try {
                    let bookValue = parseInt(element.bookValue) / 10 ** parseInt(element.decimals);
                    let liquidationValue = parseInt(element.liquidationValue) / 10 ** parseInt(element.decimals);
                    let price = parseFloat(getters.web3.utils.fromWei(element.price));

                    let liquidationPrice = 0
                    let bookPrice = 0

                    if (liquidationValue !== 0 && bookValue !== 0)
                        liquidationPrice = liquidationValue / bookValue;

                    if (bookValue !== 0 && price !== 0)
                        bookPrice = bookValue * price

                    data.push({
                        symbol: element.symbol,
                        bookValue: accounting.formatMoney(bookValue, accountingConfig),
                        price: accounting.formatMoney(price, accountingConfig),
                        bookPrice: accounting.formatMoney(bookPrice, accountingConfig),
                        liquidationPrice: accounting.formatMoney(liquidationPrice, accountingConfig),
                        liquidationValue: accounting.formatMoney(liquidationValue, accountingConfig),
                    })
                } catch (e) {
                    console.log(e)
                }
            }

            commit('setCurrentTotalData', data)
        })


    }


};

const mutations = {

    setCurrentTotalData(state, currentTotalData) {
        state.currentTotalData = currentTotalData;
    },

    setContracts(state, contracts) {
        state.contracts = contracts;
    },

    setAccount(state, account) {
        state.account = account;
    },

    setWeb3(state, web3) {
        state.web3 = web3;
    },

    setBalance(state, balance) {
        state.balance = balance;
    },

    setGasPrice(state, price) {
        state.gasPrice = price;
    },

    setTotalOvn(state, totalOvn) {
        state.totalOvn = totalOvn;
    },

    setTransactionLogs(state, transactionLogs) {
        state.transactionLogs = transactionLogs;
    },

};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
};
