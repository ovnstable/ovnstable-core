const state = {
    show: false,
    text: '',
    textSecond: '',
};

const getters = {


    show(state) {
        return state.show;
    },
    text(state) {
        return state.text;
    },

    textSecond(state) {
        return state.textSecond;
    },

};

const actions = {


    show({commit, dispatch, getters}, text) {
        commit('setText', text);
        commit('setShow', true)
    },

    addText({commit, dispatch, getters}, text) {

        commit('setTextSecond', getters.text);
        commit('setText', text);
    },


    hide({commit, dispatch, getters}) {
        commit('setShow', false);
        commit('setText', null)
        commit('setTextSecond', null)
    },

};

const mutations = {

    setText(state, text) {
        state.text = text;
    },

    setTextSecond(state, textSecond) {
        state.textSecond = textSecond;
    },

    setShow(state, show) {
        state.show = show;
    },


};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
};
