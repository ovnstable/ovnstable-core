<template>
  <v-app-bar
      dense
      app
      color="white"
      class="app-bar"
  >

    <v-col lg="1" class="ml-0 pl-0">
      <v-row dense style="width: 400px">
        <div style="width: 40px; height: 40px">
          <v-img :src="require('../assets/main-logo.png')"></v-img>
        </div>
        <div class="logo-title ml-2 mt-1">OVERNIGHT</div>
      </v-row>
    </v-col>
    <v-col lg="4"></v-col>
    <v-col lg="2" class="ma-0 pa-0">
      <div>
        <span v-bind:class="{'active-tab': rootId}" class="in-active-tab" @click="$router.push('/')">Swap</span>
        <span v-bind:class="{'active-tab': dashboardId}" class="in-active-tab ml-10" @click="$router.push('/dashboard')">Dashboard</span>
        <span v-bind:class="{'active-tab': statsId}" class="in-active-tab ml-10" @click="$router.push('/stats')">Stats</span>
      </div>

    </v-col>
    <v-col lg="2"></v-col>
    <v-col lg="3">
      <v-row dense class="pt-2">
        <v-col class="justify-end" v-on:click="onBoardInit">
          <button class="btn">Connect Wallet
            <v-icon color="#C7C7C7" class="ml-1">mdi-logout</v-icon>
          </button>
          <img class="type ml-5" :src="require('../assets/eth.png')" height="40" width="40"/>
          <img class="settings ml-5" :src="require('../assets/gear.png')" height="35" width="35"/>
        </v-col>
      </v-row>
    </v-col>
  </v-app-bar>
</template>
<script>
import Web3 from "web3";
import Onboard from 'bnc-onboard'


export default {
  name: 'Header',
  components: {},
  data: () => ({
    menu: false,
    exitAppShow: false,
    direction: 'top',
    fab: false,
    tab: null,
    currentDate: null,
    showLimitTooltip: false,

    ethLogo: require('../assets/currencies/eth.svg'),
    polLogo: require('../assets/currencies/pol.svg'),

  }),

  watch: {
    '$route.params.search': {
      handler: function(search) {
        console.log(search)
      },
      deep: true,
      immediate: true
    }
  },

  computed: {

    dashboardId(){
      return this.$router.currentRoute.path === '/dashboard';
    },

    rootId(){
      return this.$router.currentRoute.path === '/';
    },

    statsId(){
      return this.$router.currentRoute.path === '/stats';
    },
  },

  methods: {

    async onBoardInit() {

      let web3
      const BLOCKNATIVE_KEY = '334dcfd0-ce7f-4fcc-92ca-962c43f98a4a'
      const NETWORK_ID = 1

      const onboard = Onboard({
        dappId: BLOCKNATIVE_KEY,
        networkId: NETWORK_ID,
        subscriptions: {
          wallet: wallet => {
            // instantiate web3 when the user has selected a wallet
            web3 = new Web3(wallet.provider)
            console.log(`${wallet.name} connected!`)

          }
        }
      })

      await onboard.walletSelect()
      await onboard.walletCheck();

    },


  },
};
</script>
<style>
.app-bar {
  box-shadow: 0 2px 4px -1px rgba(255, 255, 255, 0.2), 0 4px 5px 0 rgba(215, 214, 214, 0.14), 0 1px 10px 0 rgba(255, 255, 255, 0.12) !important;
}

.tabs {
  font-size: 25px;
}

.active-tab {
  color: #171717;
  font-size: 25px;
  font-weight: bold;
  border-bottom: 4px solid #171717;
  cursor: pointer;
}

.in-active-tab {
  color: #5686B2;
  font-size: 25px;
  font-weight: bold;
  cursor: pointer;
}

.btn {
  cursor: pointer; /* Mouse pointer on hover */
  color: #686868;
  width: 210px;
  height: 35px;
  font-weight: 600;
  font-size: 14px;
  border: 1px solid #ECECEC;
  border-radius: 10px;
  opacity: 0.8;
}

/* Darker background on mouse-over */
.btn:hover {
  opacity: 1;
  transition: 0.3s;
}

.type {
  cursor: pointer;
}

.settings {
  cursor: pointer;
}

.logo-title {
  color: #40404C;
  font-size: 25px;
  font-weight: 800;
  letter-spacing: 3px;
}
</style>
