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

    totalOvn: {
        totalMint: 0,
        totalBurn: 0,
        totalSupply: 0,
    },

    balance: {
        ovn: 0,
        usdc: 0,
    },

    transactionLogs: [],
    transactionLogsLoader: false,
    payouts: [],
};

const getters = {

    balance(state) {
        return state.balance;
    },

    currentTotalData(state) {
        return state.currentTotalData;
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

    payouts(state) {
        return state.payouts;
    },

    transactionLogsLoader(state) {
        return state.transactionLogsLoader;
    },

};

const actions = {


    async refreshBalance({commit, dispatch, getters, rootState}) {

        let web3 = rootState.web3;

        let ovn;
        let usdc;
        try {
            usdc = await web3.contracts.usdc.methods.balanceOf(web3.account).call();
        } catch (e) {
            console.log('ERROR: ' +  e )
            await new Promise(resolve => setTimeout(resolve, 2000));
            try {
                usdc = await web3.contracts.usdc.methods.balanceOf(web3.account).call();
            } catch (e) {
                console.log('ERROR: ' +  e )
                await new Promise(resolve => setTimeout(resolve, 2000));
                usdc = await web3.contracts.usdc.methods.balanceOf(web3.account).call();
            }
        }

        try {
            ovn = await web3.contracts.ovn.methods.balanceOf(web3.account).call();
        } catch (e) {
            console.log('ERROR: ' +  e )
            await new Promise(resolve => setTimeout(resolve, 2000));
            try {
                ovn = await web3.contracts.ovn.methods.balanceOf(web3.account).call();
            } catch (e) {
                console.log('ERROR: ' +  e )
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

    },

    async resetUserData({commit, dispatch, getters }){
        commit('setBalance', {
            ovn: 0,
            usdc: 0
        });

        commit('setTransactionLogs', [])
    },

    async refreshUserData({commit, dispatch, getters }){
        dispatch('refreshBalance')
        dispatch('refreshTransactionLogs')
    },

    async refreshNotUserData({commit, dispatch, getters }){
        dispatch('refreshPayouts')
        dispatch('refreshCurrentTotalData')
        dispatch('refreshTotalOvn')
    },

    async refreshPayouts({commit, dispatch, getters, rootState}) {
        let web3 = rootState.web3.web3;

        let exchange = rootState.web3.contracts.exchange.options.address;
        let token = 'YZPR4G2H7JSIIPXI5NTWN5G1HDX43GSUCR';
        let topik = '0x6997cdab3aebbbb5a28dbdf7c61a3c7e9ee2c38784bbe66b9c4e58078e3b587f';
        let fromBlock = 19022018;
        let toBlock = await web3.eth.getBlockNumber();

        axios.get(`https://api.polygonscan.com/api?module=logs&action=getLogs&fromBlock=${fromBlock}&toBlock=${toBlock}&address=${exchange}&topic0=${topik}&apikey=${token}`)
            .then(value => {


                let result = [];
                for (let i = 1; i < value.data.result.length; i++) {

                    let item = value.data.result[i];
                    let log = { }

                    log.date= new Date(item.timeStamp*1000);
                    log.id= i;
                    log.transactionHash = item.transactionHash;

                    let params = web3.eth.abi.decodeParameters(['uint256', 'uint256', 'uint256', 'uint256'], item.data)
                    log.totalOvn = params[0] / 10 ** 6;
                    log.totalUsdc = params[1] / 10 ** 6;
                    log.totallyAmountRewarded = params[2] / 10 ** 6;
                    log.totallySaved = params[3] / 10 ** 6;
                    log.dailyProfit = (log.totallyAmountRewarded / log.totalOvn);
                    log.annualizedYield = (((log.dailyProfit+1)**365)-1)*100

                    result.push(log)
                }

                result.sort(function(a,b){
                    return new Date(b.date) - new Date(a.date);
                });



                commit('setPayouts', result)
            })

    },


    async refreshTransactionLogs({commit, dispatch, getters, rootState}) {

        commit('setTransactionLogsLoader', true)
        let exchange = rootState.web3.contracts.exchange.options.address.toLowerCase();
        let ovn = rootState.web3.contracts.ovn.options.address.toLowerCase();
        let usdc = rootState.web3.contracts.usdc.options.address.toLowerCase();
        let account = rootState.web3.account.toLowerCase();
        let token = 'YZPR4G2H7JSIIPXI5NTWN5G1HDX43GSUCR';
        let rewarder ='0x5cb01385d3097b6a189d1ac8ba3364d900666445'.toLowerCase();

        let response = await axios.get(`https://api.polygonscan.com/api?module=account&action=tokentx&address=${account}&startblock=0&endblock=19999999&sort=desc&apikey=${token}`);
        let result = response.data.result;

        let logs = [];
        let id = 1;
        for (let i = 0; i < result.length; i++) {
            let item = result[i];

            let log = {
                date: new Date(item.timeStamp*1000),
                id: id,
            }

            if (item.from === exchange && item.contractAddress === usdc) {
                let sum = item.value / 10 ** 6;
                log.name = `OVN Redeemed for ${sum} ${item.tokenSymbol}`;
                log.sum = sum;
                logs.push(log);
                id++;
            }else if (item.from === account && item.to === exchange && item.contractAddress === usdc){
                let sum = item.value / 10 ** 6;
                log.name = `${item.tokenSymbol} Minting for ${sum} OVN`;
                log.sum = sum;
                logs.push(log);
                id++;
            }else if(item.from === '0x0000000000000000000000000000000000000000' && item.to === account && item.contractAddress === ovn){

                let transaction = await rootState.web3.web3.eth.getTransactionReceipt(item.hash);
                if (transaction.from === rewarder){
                    let sum = item.value / 10 ** 6;
                    log.name = `Rewarding ${sum} OVN`;
                    log.sum = sum;
                    logs.push(log);
                    id++;
                }


            }
        }

        commit('setTransactionLogs', logs)
        commit('setTransactionLogsLoader', false)

    },


    async refreshTotalOvn({commit, dispatch, getters}) {

        axios.get('/total').then(value => {
            commit('setTotalOvn', value.data);
        })

    },




    async refreshCurrentTotalData({commit, dispatch, getters, rootState}) {

        let web3 = rootState.web3;
        web3.contracts.m2m.methods.activesPrices().call().then(value => {

            let data = [];
            for (let i = 0; i < value.length; i++) {
                let element = value[i];

                try {
                    let symbol = element.symbol;
                    let bookValue = parseInt(element.bookValue) / 10 ** parseInt(element.decimals);
                    let liquidationValue = parseInt(element.liquidationValue) / 10 ** parseInt(element.decimals);
                    let price = 0;
                    let liquidationPrice = 0
                    let bookPrice = 0

                    switch (symbol){
                        case 'USDC':
                        case 'amUSDC':
                            price = 1;
                            liquidationPrice = 1;
                            break
                        default:
                            price = parseFloat(web3.web3.utils.fromWei(element.price));
                            if (liquidationValue !== 0 && bookValue !== 0)
                                liquidationPrice = liquidationValue / bookValue;
                    }



                    if (bookValue !== 0 && price !== 0)
                        bookPrice = bookValue * price

                    data.push({
                        symbol: symbol,
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

    setPayouts(state, payouts) {
        state.payouts = payouts;
    },

    setTransactionLogsLoader(state, transactionLogsLoader) {
        state.transactionLogsLoader= transactionLogsLoader;
    },

};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
};
