<template>
  <v-col >
    <v-card class="mt-5 card elevation-0">
      <v-card-text>

        <v-container>
          <v-row dense v-for="item in currentTotalData" class="row">
            <v-col lg="8">
              {{item.symbol}}
            </v-col>
            <v-col lg="2">
              {{item.price.toLocaleString()}}
            </v-col >
            <v-col lg="2">
              {{item.liquidationValue.toLocaleString()}}
            </v-col >
          </v-row>

          <v-row dense class="row pt-10">
            <v-col lg="8">
              Total Portfolio Value
            </v-col>
            <v-col lg="3">
              {{totalPortfolio.value.toLocaleString()}}
            </v-col>
          </v-row>

          <v-row dense class="row font-weight-bold">
            <v-col lg="8">
              Total OVNGT
            </v-col>
            <v-col lg="3">
              {{totalOVN.value.toLocaleString()}}
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
    totalPortfolio: {
      value: 0,
      status: 'UP'
    },

    totalOVN: {
      value: 0,
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


  }),


  computed: {
    ...mapGetters("profile", ["contracts", "web3", 'account', 'currentTotalData']),
  },

  created() {

  },

  methods: {

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
