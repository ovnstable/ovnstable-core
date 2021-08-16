<template>
  <v-col lg="4">
    <v-card class="mt-5 card elevation-0">
      <v-card-text>

        <v-container>
          <v-row dense v-for="item in items" class="row">
            <v-col lg="8">
              {{item.name}}
            </v-col>
            <v-col lg="3">
              {{item.value.toLocaleString()}}
            </v-col >
            <v-col lg="1">
              <v-icon small color="#00FF19" v-if="item.status === 'UP'">mdi-arrow-up-drop-circle</v-icon>
              <v-icon small color="#FF0000" v-if="item.status === 'DOWN'" >mdi-arrow-down-drop-circle</v-icon>
              <template v-else></template>
            </v-col>
          </v-row>

          <v-row dense class="row pt-10">
            <v-col lg="8">
              Total Portfolio Value
            </v-col>
            <v-col lg="3">
              {{totalPortfolio.value.toLocaleString()}}
            </v-col>
            <v-col lg="1">
                <v-icon small color="#00FF19" v-if="totalPortfolio.status === 'UP'">mdi-arrow-up-drop-circle</v-icon>
                <v-icon small color="#FF0000" v-if="totalPortfolio.status === 'DOWN'" >mdi-arrow-down-drop-circle</v-icon>
                <template v-else></template>
            </v-col>
          </v-row>

          <v-row dense class="row font-weight-bold">
            <v-col lg="8">
              Total OVNGT
            </v-col>
            <v-col lg="3">
              {{totalOVN.value.toLocaleString()}}
            </v-col>
            <v-col lg="1">
              <v-icon small color="#00FF19" v-if="totalOVN.status === 'UP'">mdi-arrow-up-drop-circle</v-icon>
              <v-icon small color="#FF0000" v-if="totalOVN.status === 'DOWN'" >mdi-arrow-down-drop-circle</v-icon>
              <template v-else></template>
            </v-col>
          </v-row>
        </v-container>

      </v-card-text>
    </v-card>
  </v-col>

</template>

<script>
import {mapGetters} from "vuex";
import web3 from "web3";
import utils from 'web3-utils';

export default {
  name: "CurrentTotalData",
  data: () => ({
    menu: false,
    tab: null,
    currency: {id: 'usdc'},

    currencies: [],

    sum: null,

    totalPortfolio: {
      value: 831435.95,
      status: 'UP'
    },

    totalOVN: {
      value: 830000.00,
      status: 'UP'
    },

    items: [
      {
        name: 'USDC',
        value: 13512.10,
        status: 'UP',
      },
      {
        name: 'DAI',
        value: 7582.48,
        status: 'DOWN',
      },

      {
        name: 'aUSDC (USDC deposit in AAVE)',
        value: 100000.00,
        status: 'UP',
      },

      {
        name: 'aDAI (DAI deposit in AAVE)',
        value: 123209.09,
        status: 'UP',
      },

      {
        name: 'curve (aave pool- aUSDC+aDAI+aUSDT)',
        value: 584058.40,
        status: 'UP',
      },

      {
        name: 'CRV',
        value: 825.00,
        status: 'NONE',
      },

      {
        name: 'Matic',
        value: 1331.76,
        status: 'DOWN',
      },

      {
        name: 'stkAAVE token',
        value: 174.72,
        status: 'UP',
      },
    ],

    gas: null,

    buyCurrency: null,
    buyCurrencies: [{
      id: 'ovn',
      title: 'OVN',
      image: require('../../assets/currencies/ovn.svg')
    }],


  }),


  computed: {
    ...mapGetters("contracts", ["getContractData"]),
    ...mapGetters('accounts', ['activeAccount', 'activeBalance']),
    ...mapGetters("drizzle", ["isDrizzleInitialized", "drizzleInstance"]),
    ...mapGetters("profile", ["contracts", "web3", 'account']),
  },

  created() {

    this.currencies.push({id: 'usdc', title: 'USDC', image: require('../../assets/currencies/usdc.svg')});
    this.currencies.push({id: 'dai', title: 'DAI', image: require('../../assets/currencies/dai.svg')});

    this.currency = this.currencies[0];

    this.buyCurrency = this.buyCurrencies[0];
  },

  methods: {


    buy() {


      try {
        let toWei = utils.toWei(this.sum);

        let contracts = this.contracts;
        let from = this.account;

        contracts.usdc.methods.approve(from, toWei).send({from: from}).then(function () {
          alert('Success first step!')
        });

        contracts.exchange.methods.buy(toWei).send().then(function (){
          alert('Success second step!')
        });

      } catch (e) {
        console.log(e)
      }
    },

    selectItem(item) {
      this.currency = item;
    }
  }
}
</script>

<style scoped lang="scss">


.card {
  border-radius: 15px;
  border: 1px solid #BBBBBB;
}

.row {
  color: #171717;
  font-size: 17px;
}


</style>
