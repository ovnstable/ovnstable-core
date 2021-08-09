<template>
  <div class="pa-5" >
    <v-row dense>
      <v-col lg="9" sm="10" class="pb-0 mb-0">
        <v-text-field color="black"
                      class="pb-0 mb-0"
                      placeholder="0.0"
                      outlined
                      v-model="sum"
                      dense></v-text-field>
      </v-col>

      <v-col lg="3" sm="10">

        <v-select color="black"
                  outlined
                  dense
                  item-value="id"
                  item-text="name"
                  v-model="currency"
                  :items="currencies"
        >

        </v-select>
      </v-col>
    </v-row>

    <v-row dense class="justify-center pb-5">
      <v-icon large>mdi-arrow-down</v-icon>
    </v-row>

    <v-row dense>

      <v-col lg="9" sm="10">
        <v-text-field color="black"
                      readonly
                      placeholder="0.0"
                      outlined
                      v-model="sum"
                      dense></v-text-field>
      </v-col>
      <v-col lg="3" sm="10">

        <v-select color="black"
                  outlined
                  dense
                  disabled
                  item-value="id"
                  item-text="name"
                  v-model="buyCurrency"
                  :items="BuyCurrencies"
        ></v-select>

      </v-col>
    </v-row>

    <v-row dense class="justify-center pb-8">
      <v-btn large outlined @click="buy" :disabled="!sum">Buy</v-btn>
    </v-row>
  </div>
</template>

<script>
import {mapGetters} from "vuex";
import web3 from 'web3';

export default {
  name: "Deposit",

  data: () => ({
    menu: false,
    tab: null,
    currency: {id: 'usdc'},

    currencies: [],

    sum: null,

    buyCurrency: {id: 'overnight'},
    BuyCurrencies: [
      {
        id: 'overnight',
        name: 'OVNGT',
        image: require('../../assets/currencies//usdc.svg')
      }
    ],


  }),


  computed: {
    ...mapGetters("contracts", ["getContractData"]),
    ...mapGetters('accounts', ['activeAccount', 'activeBalance']),
    ...mapGetters("drizzle", ["isDrizzleInitialized", "drizzleInstance"]),

  },

  created() {

    this.currencies.push({id: 'usdc', name: 'USDC', image: require('../../assets/currencies/usdc.svg')});
    this.currencies.push({id: 'dai', name: 'DAI', image: require('../../assets/currencies/dai.svg')});

  },

  methods: {


    buy() {


      const contrUSDC = this.drizzleInstance.contracts["USDCtest"];
      const bidContract = this.drizzleInstance.contracts["Exchange"];

      const approved = contrUSDC.methods['approve'].cacheSend( bidContract.address,web3.utils.toWei(this.sum))
      console.log(approved)

      let stackId = bidContract.methods['buy'].cacheSend(web3.utils.toWei(this.sum));

      console.log(stackId)
    },

    selectItem(item) {
      this.currency = item;
    }
  }
}
</script>

<style scoped>

</style>
