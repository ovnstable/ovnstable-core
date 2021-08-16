const state = {
    usdcTokenBalance: 0,
    ovngtTokenBalance: 0,
    daiBalance: 0,


    contracts: null,
    account: null,
    web3: null,

    balanceMint: 0,
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
    async getUsdcTokenBalance({commit, rootState: state}) {
        let drizzleInstance = state.drizzle.drizzleInstance;
        let activeAccount = state.accounts.activeAccount;

        const smallUnitBalance = await drizzleInstance.contracts.USDCtest.methods.balanceOf(activeAccount).call();
        commit("setUsdcTokenBalance", drizzleInstance.web3.utils.fromWei(smallUnitBalance, "ether"));

    },

    async getBalanceMint({commit, dispatch, getters}, value) {

        let balance = 0;
        switch (value) {
            case 'USDC':
                balance = await getters.contracts.usdc.methods.balanceOf(getters.account).call();

        }

        console.log(balance)
        commit('setBalanceMint', state.web3.utils.fromWei(balance, 'ether'));
    },

    async getDaiBalance({commit, rootState: state}) {
        let drizzleInstance = state.drizzle.drizzleInstance;
        let activeAccount = state.accounts.activeAccount;

        const smallUnitBalance = await drizzleInstance.contracts.DAItest.methods.balanceOf(activeAccount).call();
        commit("setDaiBalance", drizzleInstance.web3.utils.fromWei(smallUnitBalance, "ether"));
    },

    async getOvngtTokenBalance({commit, rootState: state}) {
        let drizzleInstance = state.drizzle.drizzleInstance;

        const smallUnitBalance = await drizzleInstance.contracts.Exchange.methods.balance().call();
        commit("setOvngtTokenBalance", drizzleInstance.web3.utils.fromWei(smallUnitBalance, "ether"));
    }

};

const mutations = {
    setUsdcTokenBalance(state, balance) {
        state.usdcTokenBalance = balance;
    },

    setOvngtTokenBalance(state, balance) {
        state.ovngtTokenBalance = balance;
    },

    setDaiBalance(state, balance) {
        state.daiBalance = balance;
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

    setBalanceMint(state, balanceMint) {
        state.balanceMint = balanceMint;
    }
};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
};
