import Vue from 'vue'
import App from './App.vue'
import Vuex from 'vuex'
import store from "./store/index.js";
import utils from "./plugins/utils";
import abiDecoder from "./plugins/abiDecoder";
import vuetify from './plugins/vuetify'
import web3 from './plugins/web3';
import router from './router/index'

Vue.use(Vuex)

Vue.prototype.$utils = utils;
Vue.prototype.$abiDecoder = abiDecoder;
Vue.prototype.$web3 = web3;

Vue.config.productionTip = false

new Vue({
  store,
  vuetify,
  router,
  render: h => h(App)
}).$mount('#app')
