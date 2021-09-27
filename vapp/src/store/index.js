import Vue from 'vue';
import Vuex from 'vuex';
import profile from "./modules/profile";
import showTransactions from './modules/show-transaction';
import logTransactions from './modules/log-transaction';
import gasPrice from './modules/gas-price';
import web3 from "./modules/web3";

Vue.use(Vuex);

export default new Vuex.Store({
    modules: {
        profile,
        gasPrice,
        showTransactions,
        logTransactions,
        web3
    }
});
