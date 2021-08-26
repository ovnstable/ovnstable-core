import Vue from 'vue';
import Vuex from 'vuex';
import profile from "./modules/profile";
import showTransactions from './modules/show-transation';

Vue.use(Vuex);

export default new Vuex.Store({
    modules: {
        profile,
        showTransactions
    }
});
