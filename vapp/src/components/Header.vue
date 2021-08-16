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
        <span v-bind:class="activeTabSave" @click="$router.push('/')">Swap</span>
        <span v-bind:class="activeTabDashboard" class=" ml-10" @click="$router.push('/dashboard')">Dashboard</span>
        <span v-bind:class="activeTabStats" class="ml-10" @click="$router.push('/stats')">Stats</span>
      </div>

    </v-col>
    <v-col lg="2"></v-col>
    <v-col lg="3">
      <v-row dense class="pt-2 ">
        <v-col class="justify-end" v-on:click="testNative">
          <button v-if="!account" class="btn">Connect Wallet
            <v-icon color="#C7C7C7" class="ml-1">mdi-logout</v-icon>
          </button>
          <div v-else>{{account}}</div>
          <!--          <img class="type ml-5" :src="require('../assets/eth.png')" height="40" width="40"/>-->
          <!--          <img class="settings ml-5" :src="require('../assets/gear.png')" height="35" width="35"/>-->
        </v-col>
      </v-row>
    </v-col>
  </v-app-bar>
</template>
<script>
import Web3 from "web3";
import {mapActions, mapGetters, mapMutations} from "vuex";

import contract from '@truffle/contract';


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

    tabId: 1,
  }),


  watch: {


    $route(to, from) {

      switch (to.path) {
        case '/':
          this.tabId = 1;
          break;
        case '/stats':
          this.tabId = 3;
          break;
        case '/dashboard':
          this.tabId = 2;
          break;
      }
    }
  },


  computed: {


    ...mapGetters('profile', ['exchange', 'account', 'web3']),


    activeTabSave: function () {
      return {
        'active-tab': this.tabId === 1,
        'in-active-tab': this.tabId !== 1,
      }
    },

    activeTabDashboard: function () {
      return {
        'active-tab': this.tabId === 2,
        'in-active-tab': this.tabId !== 2,
      }
    },


    activeTabStats: function () {
      return {
        'active-tab': this.tabId === 3,
        'in-active-tab': this.tabId !== 3,
      }
    },
  },



  methods: {


    ...mapMutations('profile', ['setContracts', 'setAccount', 'setWeb3']),
    ...mapActions('profile', ['getBalanceMint']),

    async testNative() {

      const web3 = new Web3(window.ethereum);

      await window.ethereum.enable();
      this.setWeb3(web3);

      this.web3.eth.getAccounts((error, accounts) => {
        let account = accounts[0];
        this.setAccount(account);


        let first1 = this.load(require('../contracts/Exchange.json'), account, web3);
        let first2 = this.load(require('../contracts/USDCtest.json'), account, web3);
        let first3 = this.load(require('../contracts/OvernightToken.json'), account, web3);

        this.setContracts({exchange: first1, usdc: first2, ovn: first3})
        this.getBalanceMint('USDC');
      });


    },


    load(file, account, web3){

      let contractConfig = contract(file);

      const networkId = 999;

      const {abi, networks, deployedBytecode} = contractConfig
      let ethContract = new web3.eth.Contract(abi, networks[networkId].address, {
        from: account,
        data: deployedBytecode
      });


      return ethContract;
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
  color: #5686B2;
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
