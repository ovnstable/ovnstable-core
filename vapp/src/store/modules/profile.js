const state = {
    contracts: null,
    account: null,
    web3: null,


    balance: {
        ovn: 0,
        usdc: 0,
    },
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

    web3(state) {
        return state.web3;
    },
};

const actions = {


    async refreshBalance({commit, dispatch, getters}){

        let usdc = await getters.contracts.usdc.methods.balanceOf(getters.account).call();
        let ovn =  await getters.contracts.exchange.methods.balance().call();

        commit('setBalance', {
            ovn: ovn,
            usdc: usdc
        })

    }


};

const mutations = {



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
        state.balance= balance;
    },


};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
};
