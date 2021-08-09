<template>
  <div class="pa-5" >

    <v-row dense>

      <v-col cols="9">
        <v-text-field color="black"
                      placeholder="0.0"
                      outlined
                      v-model="sum"
                      dense></v-text-field>
      </v-col>
      <v-col cols="3">

        <v-select color="black"
                  outlined
                  dense
                  readonly
                  item-value="id"
                  item-text="name"
                  v-model="buyCurrency"
                  :items="BuyCurrencies"
        ></v-select>

      </v-col>
    </v-row>
    <v-row dense class="justify-center pb-5">
      <v-icon large>mdi-arrow-down</v-icon>
    </v-row>
    <v-row dense>
      <v-col cols="9" class="pb-0 mb-0">
        <v-text-field color="black"
                      class="pb-0 mb-0"
                      placeholder="0.0"
                      outlined
                      readonly
                      v-model="sum"
                      dense></v-text-field>
      </v-col>

      <v-col cols="3">

        <v-select color="black"
                  outlined
                  dense
                  readonly
                  item-value="id"
                  item-text="name"
                  v-model="currency"
                  :items="currencies"
        >

        </v-select>
      </v-col>
    </v-row>




    <v-row dense class="justify-center pb-8">
      <v-btn large outlined @click="redeem" :disabled="!sum">Redeem</v-btn>
    </v-row>
  </div>
</template>

<script>
import {mapGetters} from "vuex";
import web3 from 'web3';


export default {
  name: "Redeem",

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


    redeem() {
      let contrOVN = this.drizzleInstance.contracts["OvernightToken"];
      let bidContract = this.drizzleInstance.contracts["Exchange"];
      const approved = contrOVN.methods['approve'].cacheSend(bidContract.address, web3.utils.toWei(this.sum))
        
        const stackId = bidContract.methods['redeem'].cacheSend(web3.utils.toWei(this.sum))

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
