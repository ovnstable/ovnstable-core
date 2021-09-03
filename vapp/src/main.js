import Vue from 'vue'
import App from './App.vue'
import Vuex from 'vuex'
import store from "./store/index.js";
import utils from "./plugins/utils";
import abiDecoder from "./plugins/abiDecoder";
import vuetify from './plugins/vuetify'
import router from './router/index'

Vue.use(Vuex)

Vue.prototype.$utils = utils;
Vue.prototype.$abiDecoder = abiDecoder;

Vue.config.productionTip = false

new Vue({
  store,
  vuetify,
  router,
  render: h => h(App)
}).$mount('#app')
