<template>
  <v-app-bar
      dense
      app
  >

    <v-col cols="2">
      <v-toolbar-title>
        <v-icon>mdi-set-right</v-icon>
        OverNight
      </v-toolbar-title>
    </v-col>

    <v-col cols="8">
      <v-tabs
          centered
      >
        <v-tabs-slider></v-tabs-slider>

        <v-tab to="/">
          Save
        </v-tab>

        <v-tab to="/exchange/swap">
          Exchange
        </v-tab>

        <v-tab to="/stats">
          Stats
        </v-tab>

        <v-tab to="/account">
          Account
        </v-tab>

        <v-tab to="/example">
          Example
        </v-tab>
      </v-tabs>
    </v-col>

    <v-col cols="2">

      <v-row class="align-center justify-end">
        <v-btn small outlined title="Account" rounded @click="onBoardInit">
          Connect
          <v-icon>mdi-wallet</v-icon>
        </v-btn>

        <v-menu
            left
            bottom
        >
          <template v-slot:activator="{ on, attrs }">
            <v-btn
                icon
                v-bind="attrs"
                v-on="on"
            >
              <v-icon>mdi-dots-vertical</v-icon>
            </v-btn>
          </template>

          <v-list>
            <v-list-item
                v-for="n in 5"
                :key="n"
                @click="() => {}"
            >
              <v-list-item-title>Option {{ n }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </v-row>
    </v-col>
  </v-app-bar>
</template>
<script>
import {mapActions, mapGetters, mapMutations} from "vuex";
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
    currentDate: null,
    showLimitTooltip: false,

    ethLogo: require('../assets/currencies/eth.svg'),
    polLogo: require('../assets/currencies/pol.svg'),

  }),

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

</style>
