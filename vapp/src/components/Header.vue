<template>
  <v-app-bar
      dense
      app
      color="white"
      class="app-bar"
  >

    <v-col lg="4" md="4" cols="2" class="ml-0 pl-0">
      <v-row dense  class="logo" @click="clickLogo">
        <div style="width: 40px; height: 40px">
          <v-img :src="require('../assets/ovn.png')"></v-img>
        </div>
        <div class="logo-title ml-2 mt-0 hidden-sm-and-down">OVERNIGHT</div>
        <span>Alpha</span>
      </v-row>
    </v-col>
    <v-col lg="4" md="4" cols="8" class="ma-0 pa-0">
      <v-row justify="center">
        <div class="hidden-xs-only">
          <span v-bind:class="activeTabSave" @click="$router.push('/')">Earn</span>
          <span v-bind:class="activeTabDashboard" class=" ml-10" @click="$router.push('/dashboard')">Dashboard</span>
          <span v-bind:class="activeTabStats" class="ml-10" @click="$router.push('/stats')">Stats</span>
        </div>
        <div class="hidden-sm-and-up mt-10">
          <v-select class="menu-select" flat solo color="#5686B2" :items="menus" v-model="menu" item-value="to"
                    @input="pushUrl" item-text="name"/>
        </div>
      </v-row>
    </v-col>
    <v-col lg="4" md="4"  class="hidden-sm-and-down">
      <v-row dense class="pt-2 " justify="end" >
        <v-row v-if="!account" justify="end" align="center">
          <button v-on:click="connectWallet" class="btn">Connect Wallet
            <v-icon color="#C7C7C7" class="ml-1">mdi-logout</v-icon>
          </button>
        </v-row>
        <v-row v-else justify="end" align="center">
          <div class="account ml-1">
            OVN: <strong>{{ balance.ovn }}</strong> {{ accountShort }}
          </div>
        </v-row>
      </v-row>
    </v-col>
  </v-app-bar>
</template>
<script>
import {mapActions, mapGetters, mapMutations} from "vuex";


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


    ...mapGetters('profile', ['exchange', 'account', 'web3', 'contractNames', 'balance']),


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
    if (find)
      this.menu = find;

    this.connectWallet();
  },


  methods: {


    ...mapMutations('profile', ['setContracts', 'setAccount', 'setWeb3']),
    ...mapActions('profile', ['refreshProfile']),


    pushUrl(to) {
      this.$router.push(to)
    },

    clickLogo(){
      window.open('https://ovnstable.io/', '_blank').focus();
    },

    connectWallet() {

      this.$web3.initComplete((value) => {
        this.setContracts(value.contracts)
        this.setAccount(value.account)
        this.refreshProfile();
      });
      this.$web3.initWeb3().then(value => {
        this.setWeb3(value)
      })

    }

  }
  ,
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

.logo {
  width: 400px;
  cursor: pointer;
}

.logo-title {
  color: #40404C;
  font-size: 25px;
  font-weight: 800;
  letter-spacing: 3px;
}
</style>
