const state = {
    usdcTokenBalance: 0,
    ovngtTokenBalance: 0,
    daiBalance: 0,


    contracts: null,
    account: null,
    web3: null,

    balanceMint: 0,
    balanceRedeem: 0,
};

const getters = {
    usdcTokenBalance(state) {
        return state.usdcTokenBalance;
    },

    daiBalance(state) {
        return state.daiBalance;
    },

    ovngtTokenBalance(state) {
        return state.ovngtTokenBalance;
    },

    balanceMint(state) {
        return state.balanceMint;
    },

    balanceRedeem(state) {
        return state.balanceRedeem;
    },

    contracts(state) {
        return state.contracts;
    },
    account(state) {
        return state.account;
    },

    web3(state) {
        return state.web3;
    },
};

const actions = {

    async getBalanceMint({commit, dispatch, getters}, value) {

        let balance = 0;
        switch (value) {
            case 'USDC':
                balance = await getters.contracts.usdc.methods.balanceOf(getters.account).call();

        }

        commit('setBalanceMint', state.web3.utils.fromWei(balance, 'ether'));
    },

    async getBalanceRedeem({commit, dispatch, getters}) {

        let balance = await getters.contracts.exchange.methods.balance().call();
        commit('setBalanceRedeem', state.web3.utils.fromWei(balance, 'ether'));
    },


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

    setBalanceMint(state, balanceMint) {
        state.balanceMint = balanceMint;
    },

    setBalanceRedeem(state, balanceRedeem) {
        state.balanceRedeem = balanceRedeem;
    }
};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
};
