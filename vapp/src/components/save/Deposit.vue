<template>
  <div class="pa-5" >
    <v-row dense>
      <v-col cols="9" class="pb-0 mb-0">
        <v-text-field color="black"
                      class="pb-0 mb-0"
                      placeholder="0.0"
                      outlined
                      v-model="sum"
                      dense></v-text-field>
      </v-col>

      <v-col cols="3">

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

      <v-col cols="9">
        <v-text-field color="black"
                      readonly
                      placeholder="0.0"
                      outlined
                      v-model="sum"
                      dense></v-text-field>
      </v-col>
      <v-col cols="3">

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

export default {
  name: "Deposit",

  data: () => ({
    menu: false,
    tab: null,
    currency: {id: 'musd'},

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

    this.currencies.push({id: 'musd', name: 'mUSD', image: require('../../assets/currencies/mUsdc.svg')});
    this.currencies.push({id: 'dai', name: 'DAI', image: require('../../assets/currencies/dai.svg')});

  },

  methods: {


    buy() {

      let contract = this.drizzleInstance.contracts["Exchange"];
      // let contract = this.drizzleInstance.contracts["SimpleStorage"];
      const stackId = contract.methods['buy'].cacheSend(this.sum)

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
