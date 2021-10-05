
const state = {

   show: false,
};

const getters = {


    show(state) {
        return state.show;
    },


};

const actions = {


    async showAccountProfile({commit, dispatch, getters, rootState}){
        commit('setShow', true)
    },

    async hideAccountProfile({commit, dispatch, getters, rootState}){
        commit('setShow', false)
    },


};

const mutations = {

    setShow(state, value) {
        state.show = value;
    },



};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
};
