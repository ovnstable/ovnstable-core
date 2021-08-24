<template>
  <v-app-bar
      dense
      app
      color="white"
      class="app-bar"
  >

    <v-col lg="4" md="2" cols="2" class="ml-0 pl-0">
      <v-row dense style="width: 400px">
        <div style="width: 40px; height: 40px">
          <v-img :src="require('../assets/main-logo.png')"></v-img>
        </div>
        <div class="logo-title ml-2 mt-1 hidden-sm-and-down">OVERNIGHT</div>
      </v-row>
    </v-col>
    <v-col lg="4" md="8" cols="8" class="ma-0 pa-0">
      <v-row justify="center">
        <div class="hidden-xs-only">
          <span v-bind:class="activeTabSave" @click="$router.push('/')">Swap</span>
          <span v-bind:class="activeTabDashboard" class=" ml-10" @click="$router.push('/dashboard')">Dashboard</span>
          <span v-bind:class="activeTabStats" class="ml-10" @click="$router.push('/stats')">Stats</span>
        </div>
        <div class="hidden-sm-and-up mt-10">
          <v-select class="menu-select" flat solo color="#5686B2" :items="menus" v-model="menu" item-value="to" @input="pushUrl" item-text="name"/>
        </div>
      </v-row>
    </v-col>
    <v-col lg="4" md="2" cols="2" class="hidden-sm-and-down">
      <v-row dense class="pt-2 " justify="end">
        <button v-on:click="testNative" v-if="!account" class="btn">Connect Wallet
          <v-icon color="#C7C7C7" class="ml-1">mdi-logout</v-icon>
        </button>
        <div v-else class="account">{{ accountShort }}</div>
      </v-row>
    </v-col>
  </v-app-bar>
</template>
<script>
import Web3 from "web3";
import {mapActions, mapGetters, mapMutations} from "vuex";

import contract from '@truffle/contract';

import Exchange from '../contracts/Exchange.json';
import USDCtest from '../contracts/USDCtest.json';
import OverNightToken from '../contracts/OvernightToken.json';
import Mark2Market from '../contracts/Mark2Market.json';
import DAItest from '../contracts/DAItest.json'

export default {
  name: 'Header',
  components: {},
  data: () => ({
    exitAppShow: false,
    direction: 'top',
    fab: false,
    tab: null,
    currentDate: null,
    showLimitTooltip: false,

    ethLogo: require('../assets/currencies/eth.svg'),
    polLogo: require('../assets/currencies/pol.svg'),

    tabId: 1,

    menu: null,

    menus: [
      {
        name: 'Swap',
        to: '/'
      },
      {
        name: 'Dashboard',
        to: '/dashboard'
      },
      {
        name: 'Stats',
        to: '/stats'
      },
    ]
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


    accountShort: function () {

      if (this.account) {
        return this.account.substring(0, 20) + '...';
      }
      return null;
    },

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


  created() {

    let path = this.$router.history.current.path;
    let find = this.menus.find(value => value.to === path);
    if(find)
      this.menu = find;

    this.testNative();
  },


  methods: {


    ...mapMutations('profile', ['setContracts', 'setAccount', 'setWeb3']),
    ...mapActions('profile', ['refreshProfile']),


    pushUrl(to){
      this.$router.push(to)
    },

    async testNative() {

      const web3 = new Web3(window.ethereum);

      await window.ethereum.enable();
      this.setWeb3(web3);

      this.web3.eth.getAccounts((error, accounts) => {
            let account = accounts[0];
            this.setAccount(account);

            let contracts = {};

            contracts.exchange = this.load(Exchange, account, web3);
            contracts.usdc = this.load(USDCtest, account, web3, '0x2791bca1f2de4661ed88a30c99a7a9449aa84174');
            contracts.dai = this.load(DAItest, account, web3, '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063');
            contracts.ovn = this.load(OverNightToken, account, web3);
            contracts.m2m = this.load(Mark2Market, account, web3);

            this.setContracts(contracts)

            this.refreshProfile();

          }
      )
      ;


    },


    load(file, account, web3, address) {

      let contractConfig = contract(file);

      const networkId = 137;

      const {abi, networks, deployedBytecode} = contractConfig

      if (!address) {
        address = networks[networkId].address
      }

      let ethContract = new web3.eth.Contract(abi, address);

      return ethContract;
    }
    ,


  },
}
;
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

.menu-select {
  width: 150px;
  font-size: 25px;
  color: #171717;
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

.account {
  cursor: pointer; /* Mouse pointer on hover */
  color: #686868;
  width: 180px;
  height: 35px;
  font-weight: 600;
  font-size: 14px;
  padding: 5px;
  border: 1px solid #ECECEC;
  border-radius: 10px;
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
