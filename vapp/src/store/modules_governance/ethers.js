import detectEthereumProvider from "@metamask/detect-provider";
import { ethers } from "ethers";
import abiDecoder from "../../plugins/abiDecoder";

const state = {
    provider: null,

};

const getters = {

    provider(state) {
        return state.provider;
    },


};

const actions = {

    async initProvider({commit, dispatch, getters, rootState}) {
        const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8555')

        commit('setProvider', provider)
    },


    async mineBlocks({commit, dispatch, getters, rootState}, count){
       await getters.provider.send('evm_mine',  {blocks: count});
    }

};

const mutations = {

    setProvider(state, value) {
        state.provider = value;
    },


};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
};



