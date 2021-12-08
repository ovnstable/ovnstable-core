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

    assets: [
        {id: "idleUsdc", address: "0x1ee6470cd75d5686d0b2b90c0305fa46fb0c89a1"},
        {id: "usdc", address: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"},
        {id: "amUsdc", address: "0x1a13F4Ca1d028320A707D99520AbFefca3998b7F"},
        {id: "am3CRV", address: "0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171"},
        {id: "am3CRVgauge", address: "0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c"},
        {id: "wMatic", address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"},
        {id: "crv", address: "0x172370d5Cd63279eFa6d502DAB29171933a610AF"}]

};

const getters = {

    overview(state) {
        return state.overview;
    },

    assets(state) {
        return state.assets;
    },

    overviewLoading(state) {
        return state.overviewLoading;
    },

    proposals(state) {
        return state.proposals;
    },


};

const actions = {

    async changeWeights({commit, dispatch, getters, rootState}, weights) {

        let portfolio = rootState.web3.contracts.portfolio;
        let account = rootState.web3.account;
        let params = {from: account};
        let result = await portfolio.methods.setWeights(weights).send(params);
    },

    async minting({commit, dispatch, getters, rootState}, request) {

        let govToken = rootState.web3.contracts.govToken;
        let account = rootState.web3.account;
        let params = {from: account};
        let result = await govToken.methods.mint(request.account, request.sum).send(params);
    },

    async delegate({commit, dispatch, getters, rootState}, address) {

        let govToken = rootState.web3.contracts.govToken;
        let account = rootState.web3.account;
        let params = {from: account};
        let result = await govToken.methods.delegate(address).send(params);
    },

    async getOverview({commit, dispatch, getters, rootState}) {

        commit('setOverviewLoading', true);

        let govToken = rootState.web3.contracts.govToken;
        let governor = rootState.web3.contracts.governor;
        let totalVotes = await govToken.methods.totalSupply().call();
        let totalDelegated = await govToken.methods.getVotes(rootState.web3.account).call();
        let totalProposals = await governor.methods.getProposals().call();

        let overview = {
            totalVotes: totalVotes,
            totalDelegated: totalDelegated,
            totalProposals: totalProposals.length
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
