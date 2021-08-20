<template>
  <v-col lg="4">
    <v-card class="mt-5 card elevation-0">
      <v-card-text>
        <v-row dense>
          <v-col class="field ">
            <v-row dense>
              <v-col lg="5">
                <v-text-field placeholder="0.00"
                              flat
                              solo
                              color="#8F8F8F"
                              class="field-sum"
                              hide-details
                              :rules="[numberRule]"
                              v-model="sum"></v-text-field>
              </v-col>
              <v-col lg="1"></v-col>
              <v-col lg="3" class="pt-3" align="end">
                <div class="max">Max: {{ balance.usdc }}</div>
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

        <v-row class="pa-3 " align="center">
          <v-col lg="2" align="center">
            <img :src="require('../../assets/icons8-arrow 1.svg').default" height="30" width="30"/>
          </v-col>
          <v-col lg="4" class="pt-1">
            <span class="gas-title">Gas fee: {{ gas }}</span>
            <img class="ml-2" :src="require('../../assets/poly.svg').default" height="20" width="20"/>
          </v-col>
          <v-col lg="6">
            <v-row justify="end">
              <span class="gas-waived pr-2">Gas fee waived if >10000</span>
            </v-row>
          </v-col>
        </v-row>
        <v-row dense>
          <v-col class="field">
            <v-row dense>
              <v-col lg="5">
                <div class="field-buy mt-1 ml-1">
                  {{ sumResult }}
                </div>
              </v-col>
              <v-col lg="1"></v-col>
              <v-col lg="3" class="pt-3" align="end">
                <div class="balance">Balance: {{ balance.ovn }}</div>
              </v-col>
              <v-col lg="3">
                <v-select append-icon="" :items="buyCurrencies" readonly color="black" v-model="buyCurrency"
                          class="custom" flat solo>
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


        <v-row dense class="pt-4">
          <v-btn height="60" class="buy elevation-0" @click="buy" :disabled="!isBuy">{{buttonLabel}}
          </v-btn>
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


    gas: 0.112,

    buyCurrency: null,
    buyCurrencies: [{
      id: 'ovn',
      title: 'OVN',
      image: require('../../assets/currencies/ovn.svg')
    }],


  }),


  computed: {

    sumResult: function () {

      if (!this.sum || this.sum === 0)
        return '0.00';
      else
        return this.sum;


    },

    buttonLabel: function (){

      if (this.isBuy){
        return 'Press to Mint & Swap'
      }else {
        return 'Enter the amount to Mint & Swap';
      }
    },

    isBuy: function () {
      return this.account && this.sum > 0 && this.numberRule;
    },

    numberRule: function () {

      let v = this.sum;

      if (!v)
        return true;

      if (!v.trim()) return true;
      if (!isNaN(parseFloat(v)) && v >= 0 && v <= parseFloat(this.balance.usdc)) return true;


      return 'Number has to be between 1 and ' + this.balance.usdc;
    },


    ...mapGetters("profile", ["contracts", "web3", 'account', 'balance']),
  },

  created() {

    this.currencies.push({id: 'usdc', title: 'USDC', image: require('../../assets/currencies/usdc.svg')});
    this.currencies.push({id: 'dai', title: 'DAI', image: require('../../assets/currencies/dai.svg')});

    this.currency = this.currencies[0];

    this.buyCurrency = this.buyCurrencies[0];

  },

  methods: {

    ...mapActions("profile", ['refreshBalance', 'refreshCurrentTotalData']),

    setSum(value) {
      this.sum = value;
    },

    buy() {


      try {
        let toWei = utils.toWei(this.sum);
        let bn = utils.toBN(this.sum);
        let refreshBalance = this.refreshBalance;
        let refreshCurrentTotalData = this.refreshCurrentTotalData;

        let contracts = this.contracts;
        let from = this.account;
        let setSum = this.setSum;


        contracts.usdc.methods.approve(contracts.exchange.options.address, toWei).send({from: from}).then(function () {
          alert('Success first step!')

          contracts.exchange.methods.buy(contracts.usdc.options.address, bn).send({from: from}).then(function () {
            alert('Success second step!')

            refreshBalance();
            refreshCurrentTotalData();
            setSum(null)
          });
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

.field-buy {
  padding: 10px;
  color: #8F8F8F;
  font-size: 18px;
  font-weight: bold;
  background-color: #ECECEC;
  border-radius: 10px;
  white-space: nowrap;
}

.balance {
  font-weight: bold;
  color: #40404C;
  text-align: center;
  cursor: pointer;
  padding-top: 5px;
  padding-bottom: 5px;
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
  white-space: nowrap;
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

.gas-waived {
  color: #8F8F8F;
  font-size: 15px;
}

.gas-title {
  color: #8F8F8F;
  font-size: 18px;
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

.field-sum {
  font-size: 18px;
  font-weight: bold;
  color: #8F8F8F;
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
