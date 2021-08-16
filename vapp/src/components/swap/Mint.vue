<template>
  <v-col lg="4">
    <v-card class="mt-5 card elevation-0">
      <v-card-text>
        <v-row dense>
          <v-col class="field ">
            <v-row dense>
              <v-col lg="6">
                <v-text-field placeholder="0.00" flat solo v-model="sum"></v-text-field>
              </v-col>
              <v-col lg="3" class="pt-3" align="end">
                <div class="max">Max: {{balanceMint}}</div>
              </v-col>
              <v-col lg="3">
                <v-select :items="currencies" color="black" v-model="currency" class="custom" flat solo>
                  <template v-slot:selection="{ item, index }">
                    <img :src="item.image.default" width="34" height="34"><span
                      class="title-custom ml-1">{{ item.title }}</span>
                  </template>
                  <template v-slot:item="{ item }">
                    <img :src="item.image.default" width="34" height="34"> <span
                      class="title-custom">{{ item.title }}</span>
                  </template>
                </v-select>
              </v-col>
            </v-row>
          </v-col>
        </v-row>

        <v-row class="pa-3">
          <v-col lg="2">
            <span class="gas-title">Gas fee: {{ gas }}</span>
          </v-col>
          <v-col lg="8" align="center">
            <img :src="require('../../assets/icons8-arrow 1.svg').default" height="30" width="30"/>
          </v-col>
          <v-col lg="2"></v-col>
        </v-row>
        <v-row dense>
          <v-col class="field ">
            <v-row dense>
              <v-col lg="7">
                <v-text-field v-model="sum" readonly placeholder="0.00" flat solo></v-text-field>
              </v-col>
              <v-col lg="2">

              </v-col>
              <v-col lg="3">
                <v-select append-icon="" :items="buyCurrencies" readonly color="black" v-model="buyCurrency"
                          class="custom" flat solo>
                  <template v-slot:selection="{ item, index }">
                    <img :src="item.image.default" width="40" height="40"><span
                      class="title-custom ml-1">{{ item.title }}</span>
                  </template>
                  <template v-slot:item="{ item }">
                    <img :src="item.image.default" width="34" height="34"> <span
                      class="title-custom">{{ item.title }}</span>
                  </template>
                </v-select>
              </v-col>
            </v-row>
          </v-col>
        </v-row>


        <v-row dense class="pt-4">
          <v-btn height="60" class="buy elevation-0" @click="buy" :disabled="!account">Enter the amount to Mint & Swap</v-btn>
        </v-row>

        <v-row dense class="pt-4">

          <v-expansion-panels disabled class="advanced elevation-0">
            <v-expansion-panel

            >
              <v-expansion-panel-header>
                Advanced
              </v-expansion-panel-header>
              <v-expansion-panel-content>
                Max slippage
              </v-expansion-panel-content>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-row>

        <v-row dense class="pt-4">
          <v-btn height="40" class="switch elevation-0">Switch to mint via multipple assets</v-btn>
        </v-row>

      </v-card-text>
    </v-card>
  </v-col>

</template>

<script>
import {mapActions, mapGetters} from "vuex";
import web3 from "web3";
import utils from 'web3-utils';

export default {
  name: "Mint",
  data: () => ({
    menu: false,
    tab: null,
    currency: {id: 'usdc'},

    currencies: [],

    sum: null,


    gas: null,

    buyCurrency: null,
    buyCurrencies: [{
      id: 'ovn',
      title: 'OVN',
      image: require('../../assets/currencies/ovn.svg')
    }],


  }),


  computed: {


    ...mapGetters("profile", ["contracts", "web3", 'account', 'balanceMint']),
  },

  created() {

    this.currencies.push({id: 'usdc', title: 'USDC', image: require('../../assets/currencies/usdc.svg')});
    this.currencies.push({id: 'dai', title: 'DAI', image: require('../../assets/currencies/dai.svg')});

    this.currency = this.currencies[0];

    this.buyCurrency = this.buyCurrencies[0];

    this.getBalanceMint('USDC');
  },

  methods: {

    ...mapActions( "profile", ['getBalanceMint']),


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


.selector {
  padding: 5px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  color: rgb(37, 39, 45);
  height: 45px;
}

.selector:hover {
  color: rgb(37, 39, 45);
  background: rgba(247, 247, 247, 1);
  border-radius: 10px;
}

.card {
  border-radius: 15px;
  border: 1px solid #BBBBBB;
}

.max {
  font-weight: bold;
  color: #40404C;
  text-align: center;
  cursor: pointer;
  padding-top: 5px;
  padding-bottom: 5px;
  border-radius: 15px;
  border: 1px solid #BBBBBB;
}


.advanced {
  border-radius: 10px;
  border: 1px solid #BBBBBB;
  box-shadow: none !important;
}

.gas-title {
  color: #8F8F8F;
}

.switch {
  width: 100%;
  height: 60px;
  border-radius: 10px;
  padding: 5px;
  padding-top: 17px;
  background-color: #FDFDFD !important;
  color: #909399 !important;
  text-align: center;
  border: 1px solid #BBBBBB;
  font-weight: bold;
  font-size: 15px;
  cursor: pointer;
  text-transform: none;
}

.buy {
  width: 100%;
  height: 60px;
  border-radius: 10px;
  padding: 5px;
  padding-top: 17px;
  background-color: #ECECEC !important;
  color: #40404C !important;
  text-align: center;
  font-weight: bold;
  font-size: 15px;
  cursor: pointer;

  text-transform: none;
}

.field {
  width: 100%;
  height: 60px;
  border-radius: 10px;
  border: 1px solid #BBBBBB;
}

.custom.v-text-field > .v-input__control > .v-input__slot:before {
  border-style: none;
}

.custom.v-text-field > .v-input__control > .v-input__slot:after {
  border-style: none;
}

.title-custom {
  font-weight: bold;
  font-size: 18px;
}

</style>
