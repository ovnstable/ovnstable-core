const state = {
    txView: null,
    transactions: [],
};

const getters = {

    transactions(state) {
        return state.transactions;
    },

    txView(state) {
        return state.txView;
    },


};

const actions = {


    setTxView({commit, dispatch, getters}, tx) {
        commit('setTxView', tx);
    },


};

const mutations = {

    setTxView(state, txView) {
        state.txView = txView;
    },


    setTransactions(state, transactions) {
        state.transactions = transactions;
    },

};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
};
