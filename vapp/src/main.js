import Vue from 'vue'
import App from './App.vue'
import Vuex from 'vuex'
import store from "./store/index.js";

// Todo: Update this when publishing
// import drizzleVuePlugin from '@drizzle/vue-plugin'
//
import drizzleVuePlugin from '@drizzle/vue-plugin'
import drizzleOptions from './drizzleOptions'
import vuetify from './plugins/vuetify'
import router from './router/index'

Vue.use(Vuex)

Vue.use(drizzleVuePlugin, { store, drizzleOptions })

Vue.config.productionTip = false

new Vue({
  store,
  vuetify,
  router,
  render: h => h(App)
}).$mount('#app')
