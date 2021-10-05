const state = {
    show: false,
    text: '',
    textSecond: '',
    persistent: true,
    failed: false,
};

const getters = {


    show(state) {
        return state.show;
    },
    text(state) {
        return state.text;
    },

    persistent(state) {
        return state.persistent;
    },

    textSecond(state) {
        return state.textSecond;
    },

    failed(state) {
        return state.failed;
    },

};

const actions = {


    show({commit, dispatch, getters}, text) {
        commit('setPersistence', true);
        commit('setFailed', false);
        dispatch('addText', '')
        commit('setText', text);
        commit('setShow', true);
    },

    addText({commit, dispatch, getters}, text) {

        commit('setTextSecond', getters.text);
        commit('setText', text);
    },


    failed({commit, dispatch, getters}) {
        commit('setFailed', true);
        commit('setPersistence', false)
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

    setPersistence(state, persistent) {
        state.persistent = persistent;
    },

    setFailed(state, failed) {
        state.failed = failed;
    },
};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
};
