<template>
  <v-app-bar
      dense
      app
      color="white"
      class="app-bar"
  >

    <v-col lg="3" md="1" cols="2" sm="2" class="ml-0 pl-0">
      <v-row dense class="logo" @click="clickLogo">
        <div style="width: 40px; height: 40px">
          <v-img :src="require('../assets/ovn.png')"></v-img>
        </div>
        <div class="logo-title ml-2 mt-0 hidden-md-and-down">OVERNIGHT</div>
        <span>Alpha</span>
      </v-row>
    </v-col>
    <v-col lg="6" md="10" sm="8" cols="10" class="ma-0 pa-0">
      <v-row justify="center">
        <div class="hidden-xs-only">
          <span v-bind:class="activeTabSave" @click="goToAction('/')">Earn</span>
          <span v-bind:class="activeTabDashboard" class=" ml-10"
                @click="goToAction('/fund')">Portfolio & performance</span>
          <span v-bind:class="activeTabStats" class="ml-10" @click="goToAction('/stats')">Stats</span>
        </div>
        <div class="hidden-sm-and-up mt-10">
          <v-select class="menu-select" flat solo color="#5686B2" :items="menus" v-model="menu" item-value="to"
                    @input="pushUrl" item-text="name"/>
        </div>
      </v-row>
    </v-col>
    <v-col lg="3" md="1" class="hidden-sm-and-down">
      <v-row dense class="pt-2 " justify="end">

        <template v-if="networkId === 137">
          <v-row v-if="!account" justify="end" align="center">
            <button v-on:click="connectWalletAction" class="btn">Connect Wallet
              <v-icon color="#C7C7C7" class="ml-1">mdi-logout</v-icon>
            </button>
          </v-row>
          <v-row v-else justify="end" align="center">
            <div class="account ml-1">
              OVN: <strong>{{ balance.ovn }}</strong> {{ accountShort }}
            </div>
          </v-row>
        </template>
        <template v-else>
          <SwitchToPolygon/>
        </template>

      </v-row>
    </v-col>
  </v-app-bar>
</template>
<script>
import {mapActions, mapGetters, mapMutations} from "vuex";
import SwitchToPolygon from "./common/SwitchToPolygon";


export default {
  name: 'Header',
  components: {SwitchToPolygon},
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
        name: 'Earn',
        to: '/',
        id: 1
      },
      {
        name: 'Fund performance',
        to: '/fund',
        id: 2,
      },
      {
        name: 'Stats',
        to: '/stats',
        id: 3,
      },
    ]
  }),


  computed: {


    ...mapGetters('profile', ['balance']),
    ...mapGetters('web3', ['account', 'web3', 'contractNames', 'networkId']),


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
    if (find) {
      this.menu = find;
      this.tabId = find.id;
    }

  },


  methods: {


    ...mapActions('profile', ['refreshProfile']),
    ...mapActions('web3', ['connectWallet']),

    goToAction(id) {

      let menu = this.menus.find(value => value.to === id);

      if (menu === this.menu)
        return;
      else {
        this.$router.push(id)
        this.menu = menu;
        this.tabId = menu.id;
      }

    },

    pushUrl(to) {
      this.$router.push(to)
    },

    clickLogo() {
      window.open('https://ovnstable.io/', '_blank').focus();
    },

    connectWalletAction() {
      this.connectWallet();
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
