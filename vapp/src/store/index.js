import Vue from 'vue';
import Vuex from 'vuex';
import profile from "./modules/profile";
import showTransactions from './modules/show-transaction';
import logTransactions from './modules/log-transaction';

Vue.use(Vuex);

export default new Vuex.Store({
    modules: {
        profile,
        showTransactions,
        logTransactions
    }
});
