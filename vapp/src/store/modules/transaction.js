const Promise = require("bluebird");


const state = {
    transactions: [],
    transactionReceipts: [],
    transactionPending: [],
};

const getters = {

    transactions(state) {
        return state.transactions;
    },


    transactionReceipts(state) {
        return state.transactionReceipts;
    },

    transactionPending(state) {
        return state.transactionPending;
    },

};

const actions = {

    putTransactionPending({commit, dispatch, getters}, tx) {
        getters.transactionPending.push(tx);
        commit('setTransactions', getters.transactionPending);
    },


    loadTransaction({commit, dispatch, getters, rootState}) {

        for (let i = 0; i < getters.transactionPending.length; i++) {
            let transaction = getters.transactionPending[i];
            if (transaction == null)
                continue;

            console.log('Pull tx ' + transaction)
            const transactionReceiptRetry = () => rootState.web3.web3.eth.getTransactionReceipt(transaction)
                .then((receipt) => {
                    if (receipt != null) {
                        return receipt;
                    } else {
                        return Promise.delay(500).then(transactionReceiptRetry)
                    }
                });


            transactionReceiptRetry().then(value => {
                console.log('GET TX ' + value)

                this._vm.$toast.info(value)
            })
        }

    }


};

const mutations = {


    setTransactions(state, transactions) {
        state.transactions = transactions;
    },

    setTransactionReceipts(state, transactions) {
        state.transactionReceipts = transactions;
    },

    setTransactionPending(state, transactions) {
        state.transactionPending = transactions;
    },

};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
};
