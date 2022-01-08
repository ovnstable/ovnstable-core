import {axios} from "../../plugins/http-axios";
import utils from "../../plugins/utils";
import abiDecoder from "../../plugins/abiDecoder";

const proposalStates = ['Pending', 'Active', 'Canceled', 'Defeated', 'Succeeded', 'Queued', 'Expired', 'Executed'];

const state = {

    overview: {},
    overviewLoading: true,
    proposals: [],
    proposalsLoading: true,
    settings: {},
    settingsLoading: true,

    assets: [
        {id: "idleUsdc", address: "0x1ee6470cd75d5686d0b2b90c0305fa46fb0c89a1"},
        {id: "usdc", address: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"},
        {id: "amUsdc", address: "0x1a13F4Ca1d028320A707D99520AbFefca3998b7F"},
        {id: "am3CRV", address: "0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171"},
        {id: "am3CRVgauge", address: "0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c"},
        ]

};

const getters = {

    overview(state) {
        return state.overview;
    },

    assets(state) {
        return state.assets;
    },

    settings(state) {
        return state.settings;
    },

    overviewLoading(state) {
        return state.overviewLoading;
    },

    proposalsLoading(state) {
        return state.proposalsLoading;
    },

    settingsLoading(state) {
        return state.settingsLoading;
    },

    proposals(state) {
        return state.proposals;
    },


};

const actions = {

    async updateGovernanceSettings({commit, dispatch, getters, rootState}, value) {

        let governor = rootState.web3.contracts.governor;
        let account = rootState.web3.account;
        let params = {from: account};

        let name = 'Proposal #' + getters.proposals.length + 1 + ' Update Governance Settings';

        let addresses = [];
        let abis = [];
        let values = [];

        if (value.votingDelay){
            addresses.push(governor.options.address);
            abis.push(governor.methods.setVotingDelay(value.votingDelay).encodeABI());
            values.push(0);
        }

        if (value.votingPeriod){
            addresses.push(governor.options.address);
            abis.push(governor.methods.setVotingPeriod(value.votingPeriod).encodeABI());
            values.push(0);
        }

        if (value.setProposalThreshold){
            addresses.push(governor.options.address);
            abis.push(governor.methods.setProposalThreshold(value.proposalThreshold).encodeABI());
            values.push(0);
        }

        if (value.updateQuorumNumerator){
            addresses.push(governor.options.address);
            abis.push(governor.methods.updateQuorumNumerator(value.updateQuorumNumerator).encodeABI());
            values.push(0);
        }

        await governor.methods.proposeExec(addresses, values, abis, name).send(params);
    },

    async updateDelay({commit, dispatch, getters, rootState}, value) {

        let governor = rootState.web3.contracts.governor;
        let account = rootState.web3.account;
        let contract = rootState.web3.contracts.timelockController;
        let params = {from: account};

        let abi = contract.methods.updateDelay(value).encodeABI();
        let name = 'Proposal #' + getters.proposals.length + 1 + 'Update delay';
        await governor.methods.proposeExec([contract.options.address], [0], [abi], name).send(params);
    },

    async cancel({commit, dispatch, getters, rootState}, id) {

        let governor = rootState.web3.contracts.governor;

        let account = rootState.web3.account;
        let params = {from: account};
        await governor.methods.cancel(id).send(params);
    },

    async execute({commit, dispatch, getters, rootState}, id) {

        let governor = rootState.web3.contracts.governor;

        let account = rootState.web3.account;
        let params = {from: account};
        await governor.methods.executeExec(id).send(params);
    },

    async queue({commit, dispatch, getters, rootState}, id) {

        let governor = rootState.web3.contracts.governor;

        let account = rootState.web3.account;
        let params = {from: account};
        await governor.methods.queueExec(id).send(params);
    },


    async vote({commit, dispatch, getters, rootState}, request) {

        let governor = rootState.web3.contracts.governor;

        let account = rootState.web3.account;
        let params = {from: account};
        await governor.methods.castVote(request.id, request.status).send(params);
    },

    async getSettings({commit, dispatch, getters, rootState}) {

        commit('setSettingsLoading', true)
        let governor = rootState.web3.contracts.governor;
        let timelockController = rootState.web3.contracts.timelockController;

        let timeLockItem = {};
        timeLockItem.minDelay = await timelockController.methods.getMinDelay().call();

        let governorItem = {};
        governorItem.votingPeriod = await governor.methods.votingPeriod().call();
        governorItem.votingDelay = await governor.methods.votingDelay().call();
        governorItem.proposalThreshold = await governor.methods.proposalThreshold().call();
        governorItem.quorumNumerator = await governor.methods.quorumNumerator().call();

        let settings = {};
        settings.timeLock = timeLockItem;
        settings.governor = governorItem;

        commit('setSettings', settings);
        commit('setSettingsLoading', false)
    },

    async changeFeeBuy({commit, dispatch, getters, rootState}, request) {

        let contract = rootState.web3.contracts.exchange;
        let governor = rootState.web3.contracts.governor;
        let account = rootState.web3.account;

        let params = {from: account};

        let abi = contract.methods.setBuyFee(request.fee, request.feeDenominator).encodeABI();
        let name = 'Proposal #' + getters.proposals.length + 1 + 'Change set Buy Fee';
        await governor.methods.proposeExec([contract.options.address], [0], [abi], name).send(params);
    },

    async changeWeights({commit, dispatch, getters, rootState}, weights) {

        let portfolio = rootState.web3.contracts.portfolio;
        let governor = rootState.web3.contracts.governor;
        let account = rootState.web3.account;
        let params = {from: account};
        let abi = await portfolio.methods.setWeights(weights).encodeABI();
        let name = 'Proposal #' + getters.proposals.length + 1 + 'Change wights';
        await governor.methods.proposeExec([portfolio.options.address], [0], [abi], name).send(params);

    },

    async minting({commit, dispatch, getters, rootState}, request) {

        let govToken = rootState.web3.contracts.govToken;
        let account = rootState.web3.account;
        let governor = rootState.web3.contracts.governor;
        let params = {from: account};

        let wei = rootState.web3.web3.utils.toWei(request.sum, 'gwei');
        let abi = await govToken.methods.mint(request.account, wei).encodeABI();
        let name = 'Proposal #' + getters.proposals.length + 1 + 'Mint gov tokens';
        await governor.methods.proposeExec([govToken.options.address], [0], [abi], name).send(params);

    },

    async delegate({commit, dispatch, getters, rootState}, address) {

        let govToken = rootState.web3.contracts.govToken;
        let account = rootState.web3.account;
        let params = {from: account};
        let result = await govToken.methods.delegate(address).send(params);
    },

    async getProposals({commit, dispatch, getters, rootState}) {

        commit('setProposalsLoading', true);

        let governor = rootState.web3.contracts.governor;
        let proposals = await governor.methods.getProposals().call();

        proposals = [...proposals].reverse();

        let items = [];
        for (let i = 0; i < proposals.length; i++) {
            let id = proposals[i];
            let item = await governor.methods.proposals(id).call();
            let status = await governor.methods.state(id).call();

            console.log(item)
            let proposal = {
                id: item.id,
                proposer: item.proposer,
                startBlock: item.startBlock,
                endBlock: item.endBlock,
                forVotes: item.forVotes / 10 ** 18,
                againstVotes: item.againstVotes / 10 ** 18,
                abstainVotes: item.abstainVotes / 10 ** 18,
                status: status,
                statusText: proposalStates[status],
            }
            items.push(proposal);
        }


        commit('setProposals', items);
        commit('setProposalsLoading', false);
    },

    async getOverview({commit, dispatch, getters, rootState}) {

        commit('setOverviewLoading', true);

        let govToken = rootState.web3.contracts.govToken;
        let governor = rootState.web3.contracts.governor;
        let totalVotes = await govToken.methods.totalSupply().call();
        let totalDelegated = await govToken.methods.getVotes(rootState.web3.account).call();
        let totalProposals = await governor.methods.getProposals().call();

        let overview = {
            totalVotes: totalVotes / 10 ** 18,
            totalDelegated: totalDelegated / 10 ** 18,
            totalProposals: totalProposals.length
        }
        commit('setOverview', overview);

        commit('setOverviewLoading', false);

        dispatch('getSettings')
    }

};

const mutations = {

    setOverview(state, value) {
        state.overview = value;
    },

    setSettings(state, value) {
        state.settings = value;
    },

    setSettingsLoading(state, value) {
        state.settingsLoading = value;
    },

    setOverviewLoading(state, value) {
        state.overviewLoading = value;
    },

    setProposals(state, value) {
        state.proposals = value;
    },

    setProposalsLoading(state, value) {
        state.proposalsLoading = value;
    },


};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
};
