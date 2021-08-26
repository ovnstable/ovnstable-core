const state = {
    contracts: null,
    account: null,
    web3: null,


    currentTotalData: null,
    balance: {
        ovn: 0,
        usdc: 0,
    },

    gasPrice: 0,
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


    gasPrice(state) {
        return state.gasPrice;
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

    async refreshProfile({commit, dispatch, getters}) {

        dispatch('refreshGasPrice');
        dispatch('refreshCurrentTotalData');
        dispatch('refreshBalance');
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

                data.push({
                    price: getters.web3.utils.fromWei(element.price),
                    symbol: element.symbol,
                    value: element.liquidationValue,
                })
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

};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
};
