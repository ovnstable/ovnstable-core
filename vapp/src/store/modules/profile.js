const state = {
    usdcTokenBalance: 0,
    ovngtTokenBalance: 0,
};

const getters = {
    usdcTokenBalance(state) {
        return state.usdcTokenBalance;
    },

    ovngtTokenBalance(state) {
        return state.ovngtTokenBalance;
    }
};

const actions = {
    async getUsdcTokenBalance({commit, rootState: state}) {
        let drizzleInstance = state.drizzle.drizzleInstance;
        let activeAccount = state.accounts.activeAccount;

        const smallUnitBalance = await drizzleInstance.contracts.USDCtest.methods.balanceOf(activeAccount).call();
        commit("setUsdcTokenBalance", drizzleInstance.web3.utils.fromWei(smallUnitBalance, "ether"));
    },

    async getOvngtTokenBalance({commit, rootState: state}) {
        let drizzleInstance = state.drizzle.drizzleInstance;
        let activeAccount = state.accounts.activeAccount;

        const smallUnitBalance = await drizzleInstance.contracts.Exchange.methods.USDCtest.call();
        commit("setUsdcTokenBalance", drizzleInstance.web3.utils.fromWei(smallUnitBalance, "ether"));
    }

};

const mutations = {
    setUsdcTokenBalance(state, balance) {
        state.usdcTokenBalance = balance;
    },

    setOvngtTokenBalance(state, balance) {
        state.ovngtTokenBalance = balance;
    },
};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
};
