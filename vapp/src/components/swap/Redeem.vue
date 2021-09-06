<template>
  <v-col class="ma-0 pa-0">
    <v-card class="mt-5 card elevation-0">
      <v-card-text>
        <v-row dense>
          <v-col class="field ">
            <v-row dense>
              <v-col lg="4" md="5" sm="4" cols="8">
                <v-text-field placeholder="0.00"
                              flat
                              solo
                              color="#8F8F8F"
                              class="field-sum"
                              hide-details
                              v-model="sum"></v-text-field>
              </v-col>
              <v-spacer/>
              <v-col lg="4" md="4" sm="5" class="pt-3 hidden-xs-only" align="end">
                <div class="max" @click="max">Max: {{ maxResult }}</div>
              </v-col>
              <v-col lg="4" cols="4" md="3" sm="3" align="end">
                <v-row dense class="ma-0 pa-0" justify="end" align="center">
                  <CurrencySelector :readonly="true" :selected-item="buyCurrency" :items="buyCurrencies"/>
                </v-row>
              </v-col>
            </v-row>
          </v-col>
        </v-row>

        <v-row class="pa-3 "  align="center">
          <v-col lg="1" md="1" sm="1" cols="2" align="center">
            <img :src="require('../../assets/arrow.png')" height="30" width="30"/>
          </v-col>
          <v-col lg="5" cols="8" md="5" sm="5" class="pt-1">
            <v-row>
              <span class="gas-title">Gas fee: {{ gasPrice }}</span>
              <img class="ml-2" :src="require('../../assets/poly.png')" height="20" width="20"/>
            </v-row>
          </v-col>
          <v-col lg="6"  class="hidden-xs-only">
            <v-row justify="end">
              <span class="gas-waived pr-2">Gas fee waived if >10000</span>
            </v-row>
          </v-col>
        </v-row>
        <v-row dense>
          <v-col class="field">
            <v-row dense>
              <v-col lg="4" md="5" sm="4" cols="8">
                <div class="field-buy mt-1 ml-1">
                  {{ sumResult }}
                </div>
              </v-col>
              <v-spacer/>
              <v-col lg="4" md="4" sm="5" class="pt-3 hidden-xs-only" align="center">
                <div class="balance">Balance: {{ $utils.formatMoney(balance.usdc, 2) }}</div>
              </v-col>
              <v-col lg="4" cols="4" md="3" sm="3">
                <v-row dense class="ma-0 pa-0" justify="end" align="end">
                  <CurrencySelector :selected-item="currency" :items="currencies"/>
                </v-row>
              </v-col>
            </v-row>
          </v-col>
        </v-row>


        <v-row dense class="pt-4">
          <v-btn height="60" class="buy elevation-0" @click="redeem" :disabled="!isBuy">{{ buttonLabel }}</v-btn>
        </v-row>


      </v-card-text>
    </v-card>
  </v-col>
</template>

<script>
import {mapActions, mapGetters} from "vuex";
import web3 from 'web3';
import utils from "web3-utils";
import CurrencySelector from "../common/CurrencySelector";


export default {
  name: "Redeem",
  components: {CurrencySelector},
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
      image: require('../../assets/ovn.png')
    }],


  }),


  computed: {
    ...mapGetters("profile", ["contracts", "account", 'web3', 'balance', 'gasPrice']),

    sumResult: function () {
      if (!this.sum || this.sum === 0)
        return '0.00';
      else
        return this.$utils.formatMoney(this.sum.replace(/,/g, '.'), 2);
    },

    numberRule: function () {

      let v = this.sum;

      if (!v)
        return false;

      if (!v.trim()) return false;

      v = parseFloat(v);

      if (!isNaN(parseFloat(v)) && v >= 0 && v <= parseFloat(this.balance.ovn)) return true;


      return false;
    },

    maxResult() {
      return this.$utils.formatMoney(this.balance.ovn, 2);
    },

    buttonLabel: function () {

      if (this.isBuy) {
        return 'Press to Withdraw'
      } else if (this.sum > parseFloat(this.balance.ovn)) {
        return 'Invalid amount'
      } else {
        return 'Enter the amount to Withdraw';
      }
    },

    isBuy: function () {
      return this.account && this.sum > 0 && this.numberRule;
    },
  },

  created() {

    this.currencies.push({id: 'usdc', title: 'USDC', image: require('../../assets/currencies/usdc.png')});
    this.currencies.push({id: 'dai', title: 'DAI', image: require('../../assets/currencies/dai.svg')});

    this.currency = this.currencies[0];

    this.buyCurrency = this.buyCurrencies[0];


  },

  methods: {

    ...mapActions("profile", ['refreshBalance', 'refreshCurrentTotalData', 'refreshProfile']),
    ...mapActions("showTransactions", ['show', 'hide', , 'addText']),


    setSum(value) {
      this.sum = value;
    },

    max() {
      let balanceElement = this.balance.ovn;
      this.sum = balanceElement + "";
    },

    async redeem() {


      try {

        let sum = this.sum * 10 ** 6;
        let self = this;

        let contracts = this.contracts;
        let from = this.account;
        let gasPrice = this.web3.utils.toWei(this.gasPrice, 'gwei');


        this.show('Processing...')
        this.addText(`Locking ${this.sum} OVN ......  done`)


        let gasApprove = await contracts.ovn.methods.approve(contracts.exchange.options.address, sum).estimateGas({from: from});
        let approveParams = {gas: gasApprove, gasPrice: gasPrice, from: from};

        contracts.ovn.methods.approve(contracts.exchange.options.address, sum).send(approveParams).then(function () {
          self.addText(`Burning ${self.sum} OVN ......  done`);
          self.addText(`Transferring ${self.sum} USDC to ${from.substring(1, 10)}  ......  done`);


          contracts.exchange.methods.redeem(contracts.usdc.options.address, sum).estimateGas({from: from}).then((e, value) => {

            let buyParams = {gas: value, gasPrice: gasPrice, from: from};

            contracts.exchange.methods.redeem(contracts.usdc.options.address, sum).send(buyParams).then(function () {
              self.addText(`Completed, await blockchain, click to proceed`);
              setTimeout(() => self.hide(), 1000);

              self.refreshProfile();
              self.setSum(null)
            });
          })


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
  border: 1px solid #BBBBBB;
  border-radius: 10px;
  font-weight: bold;
  color: #40404C;
  text-align: center;
  max-width: 170px;
  cursor: pointer;
  padding-top: 5px;
  padding-bottom: 5px;
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
