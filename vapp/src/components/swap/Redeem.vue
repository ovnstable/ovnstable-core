<template>
  <v-col lg="4">
    <v-card class="mt-5 card elevation-0">
      <v-card-text>
        <v-row dense>
          <v-col class="field ">
            <v-row dense>
              <v-col lg="7">
                <v-text-field placeholder="0.00" flat solo v-model="sum"></v-text-field>
              </v-col>
              <v-col lg="2" class="pt-3" align="end">
                <div class="max">Max: {{balanceRedeem}}</div>

              </v-col>
              <v-col lg="3">
                <v-select :items="buyCurrencies" color="black" v-model="buyCurrency" append-icon="" readonly class="custom" flat solo>
                  <template v-slot:selection="{ item, index }">
                    <img :src="item.image.default" width="40" height="40" ><span
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
                <v-select append-icon="" :items="currencies" readonly color="black" v-model="currency"
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
          <v-btn height="60" class="buy elevation-0" @click="redeem" :disabled="!account">Withdraw</v-btn>
        </v-row>


      </v-card-text>
    </v-card>
  </v-col>
</template>

<script>
import {mapActions, mapGetters} from "vuex";
import web3 from 'web3';
import utils from "web3-utils";


export default {
  name: "Redeem",

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
    ...mapGetters("profile", ["contracts", "account", 'web3', 'balanceRedeem']),

  },

  created() {

    this.currencies.push({id: 'usdc', title: 'USDC', image: require('../../assets/currencies/usdc.svg')});
    this.currencies.push({id: 'dai', title: 'DAI', image: require('../../assets/currencies/dai.svg')});

    this.currency = this.currencies[0];

    this.buyCurrency = this.buyCurrencies[0];

    this.getBalanceRedeem();

  },

  methods: {

    ...mapActions( "profile", ['getBalanceRedeem']),


    redeem() {


      try {
        let toWei = utils.toWei(this.sum);

        let contracts = this.contracts;
        let from = this.account;
        contracts.ovn.methods.approve(from, toWei).send({from: from}).then(function () {
          alert('Success first step!')
        });

        contracts.exchange.methods.redeem(toWei).send({from: from}).then(function (){

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

<style scoped>


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


.gas-title {
  color: #8F8F8F;
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
