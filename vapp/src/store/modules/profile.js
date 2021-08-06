const state = {
    testTokenBalance: 0
};

const getters = {
    getTestTokenBalance(state) {
        return state.testTokenBalance;
    }
};

const actions = {
    async fetchTestTokenBalance({commit, rootState: state}) {
        let drizzleInstance = state.drizzle.drizzleInstance;
        let activeAccount = state.accounts.activeAccount;

        let method = drizzleInstance.contracts['Exchange'].methods['balance'];
        const smallUnitBalance = await method.cacheCall();
        commit("setTestTokenBalance", drizzleInstance.web3.utils.fromWei(smallUnitBalance, "ether"));
    }
};

const mutations = {
    setTestTokenBalance(state, balance) {
        state.testTokenBalance = balance;
    }
};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
};
