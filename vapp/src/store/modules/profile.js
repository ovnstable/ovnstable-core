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

    currentTotalData: null,
    loadingCurrentTotalData: true,

    totalOvn: {
        totalMint: 0,
        totalBurn: 0,
        totalSupply: 0,
    },

    loadingTotalOvn: true,

    balance: {
        ovn: 0,
        usdc: 0,
    },
    loadingBalance: true,

    transactionLogs: [],
    transactionLogsLoader: false,
    payouts: [],
    loadingPayouts: true,
};

const getters = {

    balance(state) {
        return state.balance;
    },


    loadingBalance(state) {
        return state.loadingBalance;
    },

    currentTotalData(state) {
        return state.currentTotalData;
    },
    loadingCurrentTotalData(state) {
        return state.loadingCurrentTotalData;
    },


    gasPrice(state) {
        return state.gasPrice;
    },

    totalOvn(state) {
        return state.totalOvn;
    },

    loadingTotalOvn(state) {
        return state.loadingTotalOvn;
    },

    transactionLogs(state) {
        return state.transactionLogs;
    },

    payouts(state) {
        return state.payouts;
    },

    loadingPayouts(state) {
        return state.loadingPayouts;
    },

    transactionLogsLoader(state) {
        return state.transactionLogsLoader;
    },

};

const actions = {


    async refreshBalance({commit, dispatch, getters, rootState}) {

        commit('setLoadingBalance', true)
        let web3 = rootState.web3;

        let ovn;
        let usdc;
        try {
            usdc = await web3.contracts.usdc.methods.balanceOf(web3.account).call();
        } catch (e) {
            console.log('ERROR: ' + e)
            await new Promise(resolve => setTimeout(resolve, 2000));
            try {
                usdc = await web3.contracts.usdc.methods.balanceOf(web3.account).call();
            } catch (e) {
                console.log('ERROR: ' + e)
                await new Promise(resolve => setTimeout(resolve, 2000));
                usdc = await web3.contracts.usdc.methods.balanceOf(web3.account).call();
            }
        }

        try {
            ovn = await web3.contracts.ovn.methods.balanceOf(web3.account).call();
        } catch (e) {
            console.log('ERROR: ' + e)
            await new Promise(resolve => setTimeout(resolve, 2000));
            try {
                ovn = await web3.contracts.ovn.methods.balanceOf(web3.account).call();
            } catch (e) {
                console.log('ERROR: ' + e)
                await new Promise(resolve => setTimeout(resolve, 2000));
                ovn = await web3.contracts.ovn.methods.balanceOf(web3.account).call();
            }
        }

        ovn = ovn / 10 ** 6;
        usdc = usdc / 10 ** 6;
        commit('setBalance', {
            ovn: ovn,
            usdc: usdc
        })

        commit('setLoadingBalance', false)

    },

    async resetUserData({commit, dispatch, getters}) {
        commit('setBalance', {
            ovn: 0,
            usdc: 0
        });

        commit('setTransactionLogs', [])
    },

    async refreshUserData({commit, dispatch, getters}) {
        dispatch('refreshBalance')
        dispatch('refreshTransactionLogs')
    },

    async refreshAfterMintRedeem({commit, dispatch, getters}) {
        dispatch('refreshBalance')
        dispatch('refreshTransactionLogs')
        dispatch('refreshCurrentTotalData')
        dispatch('refreshTotalOvn')
    },

    async refreshNotUserData({commit, dispatch, getters}) {
        dispatch('refreshPayouts')
        dispatch('refreshCurrentTotalData')
        dispatch('refreshTotalOvn')
    },

    async refreshPayouts({commit, dispatch, getters, rootState}) {
        commit('setLoadingPayouts', true);
        let web3 = rootState.web3.web3;

        axios.get(`/payouts`)
            .then(value => {


                let result = [];
                for (let i = 1; i < value.data.result.length; i++) {

                    let item = value.data.result[i];
                    let log = {}

                    log.date = new Date(item.timeStamp * 1000);
                    log.id = i;
                    log.transactionHash = item.transactionHash;

                    let params = web3.eth.abi.decodeParameters(['uint256', 'uint256', 'uint256', 'uint256'], item.data)
                    log.totalOvn = params[0] / 10 ** 6;
                    log.totalUsdc = params[1] / 10 ** 6;
                    log.totallyAmountRewarded = params[2] / 10 ** 6;
                    log.totallySaved = params[3] / 10 ** 6;
                    log.dailyProfit = (log.totallyAmountRewarded / log.totalOvn);
                    log.annualizedYield = (((log.dailyProfit + 1) ** 365) - 1) * 100

                    result.push(log)
                }

                result.sort(function (a, b) {
                    return new Date(b.date) - new Date(a.date);
                });


                commit('setPayouts', result);
                commit('setLoadingPayouts', false);
            })

    },


    async refreshTransactionLogs({commit, dispatch, getters, rootState}) {

        commit('setTransactionLogsLoader', true)
        let exchange = rootState.web3.contracts.exchange.options.address.toLowerCase();
        let ovn = rootState.web3.contracts.ovn.options.address.toLowerCase();
        let usdc = rootState.web3.contracts.usdc.options.address.toLowerCase();
        let account = rootState.web3.account.toLowerCase();
        let token = 'YZPR4G2H7JSIIPXI5NTWN5G1HDX43GSUCR';
        let rewarder = '0x5cb01385d3097b6a189d1ac8ba3364d900666445'.toLowerCase();

        let response = await axios.get(`https://api.polygonscan.com/api?module=account&action=tokentx&address=${account}&startblock=0&endblock=19999999&sort=desc&apikey=${token}`);
        let result = response.data.result;

        let logs = [];
        let id = 1;
        for (let i = 0; i < result.length; i++) {
            let item = result[i];

            let log = {
                date: new Date(item.timeStamp * 1000),
                id: id,
            }

            if (item.from === exchange && item.contractAddress === usdc) {
                let sum = item.value / 10 ** 6;
                log.name = `OVN Redeemed for ${sum} ${item.tokenSymbol}`;
                log.sum = sum;
                logs.push(log);
                id++;
            } else if (item.from === account && item.to === exchange && item.contractAddress === usdc) {
                let sum = item.value / 10 ** 6;
                log.name = `${item.tokenSymbol} Minting for ${sum} OVN`;
                log.sum = sum;
                logs.push(log);
                id++;
            } else if (item.from === '0x0000000000000000000000000000000000000000' && item.to === account && item.contractAddress === ovn) {

                try {
                    let transaction = await rootState.web3.web3.eth.getTransactionReceipt(item.hash);
                    if (transaction.from === rewarder) {
                        let sum = item.value / 10 ** 6;
                        log.name = `Rewarding ${sum} OVN`;
                        log.sum = sum;
                        logs.push(log);
                        id++;
                    }

                } catch (e) {
                    console.log(e)
                }


            }
        }

        commit('setTransactionLogs', logs)
        commit('setTransactionLogsLoader', false)

    },


    async refreshTotalOvn({commit, dispatch, getters}) {
        commit('setLoadingTotalOvn', true)
        axios.get('/total').then(value => {
            commit('setTotalOvn', value.data);
            commit('setLoadingTotalOvn', false)
        })

    },


    async refreshCurrentTotalData({commit, dispatch, getters, rootState}) {
        commit('setLoadingCurrentTotalData', true)

        axios.get('/prices').then(resp => {
            let data = [];

            let value = resp.data;
            for (let i = 0; i < value.length; i++) {
            let element = value[i];

            try {

                // let symbol = element.symbol;
                // let name = element.name;
                // let bookValue = element.amountInVault / 10 ** element.decimals;
                // let liquidationValue = element.usdcPriceInVault / 10 ** 6;
                // let price = element.usdcBuyPrice/ element.usdcPriceDenominator;
                // let liquidationPrice = element.usdcSellPrice / element.usdcPriceDenominator;
                // let bookPrice = element.usdcPriceInVault / 10 ** 6 ;
                let symbol = element.symbol;
                let name = element.name;
                let bookValue = element.amountInVault / element.usdcPriceDenominator;
                let liquidationValue = element.usdcPriceInVault / element.usdcPriceDenominator;
                let price = element.usdcBuyPrice/ element.usdcPriceDenominator;
                let liquidationPrice = element.usdcSellPrice / element.usdcPriceDenominator;
                let bookPrice = element.usdcPriceInVault / element.usdcPriceDenominator ;

                data.push({
                    symbol: symbol,
                    name: name,
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
        commit('setLoadingCurrentTotalData', false)
        })

    }


};

const mutations = {

    setCurrentTotalData(state, currentTotalData) {
        state.currentTotalData = currentTotalData;
    },

    setLoadingCurrentTotalData(state, value) {
        state.loadingCurrentTotalData = value;
    },


    setBalance(state, balance) {
        state.balance = balance;
    },

    setLoadingBalance(state, value) {
        state.loadingBalance = value;
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

    setPayouts(state, payouts) {
        state.payouts = payouts;
    },

    setTransactionLogsLoader(state, transactionLogsLoader) {
        state.transactionLogsLoader = transactionLogsLoader;
    },

    setLoadingTotalOvn(state, value) {
        state.loadingTotalOvn = value;
    },

    setLoadingPayouts(state, value) {
        state.loadingPayouts = value;
    },

};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
};
