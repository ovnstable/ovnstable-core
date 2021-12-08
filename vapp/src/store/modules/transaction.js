const Promise = require("bluebird");


const state = {
    transactions: [],
};

const getters = {

    transactions(state) {
        return state.transactions;
    },


};

const actions = {

    putTransaction({commit, dispatch, getters}, tx) {
        getters.transactions.push(tx);
        commit('setTransactions', getters.transactions);
    },


    clearTransaction({commit, dispatch, getters, rootState}){
      commit('setTransactions', [])
    },

    loadTransaction({commit, dispatch, getters, rootState}) {

        for (let i = 0; i < getters.transactions.length; i++) {
            let transaction = getters.transactions[i];
            if (transaction == null)
                continue;

            if (transaction.pending !== true){
                continue;
            }

            const transactionReceiptRetry = () => rootState.web3.web3.eth.getTransactionReceipt(transaction.hash)
                .then((receipt) => {
                    if (receipt != null) {
                        return receipt;
                    } else {
                        return Promise.delay(500).then(transactionReceiptRetry)
                    }
                });

            transactionReceiptRetry().then(value => {
                let filter = getters.transactions.find(tx=> tx.hash === value.transactionHash);
                filter.pending = false;

                commit('setTransactions', getters.transactions)
            })
        }

    }


};

const mutations = {


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
