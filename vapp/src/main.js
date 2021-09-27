import Vue from 'vue'
import App from './App.vue'
import Vuex from 'vuex'
import store from "./store/index.js";
import utils from "./plugins/utils";
import abiDecoder from "./plugins/abiDecoder";
import vuetify from './plugins/vuetify'
import router from './router/index'
import {axios} from './plugins/http-axios';
import moment from 'moment';

import Toast from "vue-toastification";
import "vue-toastification/dist/index.css";
const options = {
  toastClassName: "toast",
};
Vue.use(Toast, options);


Vue.use(Vuex)

Vue.prototype.$moment = moment;
Vue.prototype.$utils = utils;
Vue.prototype.$abiDecoder = abiDecoder;
Vue.prototype.$axios = axios;

Vue.config.productionTip = false

import VueGtag from "vue-gtag";

Vue.use(VueGtag, {
  config: { id: "G-97YQSM714C" }
}, router);


new Vue({
  store,
  vuetify,
  router,
  render: h => h(App)
}).$mount('#app')
