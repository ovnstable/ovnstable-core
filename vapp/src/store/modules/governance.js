let accounting = require("accounting-js")
import {axios} from "../../plugins/http-axios";
import utils from "../../plugins/utils";
import abiDecoder from "../../plugins/abiDecoder";

let accountingConfig = {
    symbol: "",
    precision: 6,
    thousand: " ",
};


const state = {

    overview: {},
    overviewLoading: true,
    proposals: [],
};

const getters = {

    overview(state) {
        return state.overview;
    },

    overviewLoading(state) {
        return state.overviewLoading;
    },

    proposals(state) {
        return state.proposals;
    },


};

const actions = {


    async getOverview({commit, dispatch, getters, rootState}) {

        commit('setOverviewLoading', true);

        let govToken = rootState.web3.contracts.govToken;
        let totalVotes = await govToken.methods.totalSupply().call() / 10 ** 18;

        let overview = {
            totalVotes: totalVotes,
        }
        commit('setOverview', overview);

        commit('setOverviewLoading', false);
    }

};

const mutations = {

    setOverview(state, value) {
        state.overview = value;
    },

    setOverviewLoading(state, value) {
        state.overviewLoading = value;
    },

    setProposals(state, value) {
        state.proposals = value;
    },


};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
};
