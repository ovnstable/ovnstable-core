<template>
  <v-container
      class="fill-height"
      fluid
  >
    <v-row
        align="center"
        justify="center"
    >
      <v-col
          lg="12"
          md="8"
          sm="12"

      >
        <v-row class="justify-center align-center pt-15">
          <template v-if="loadingBalance">
            <v-skeleton-loader
                type="button"
            />
          </template>
          <template v-else>
            <div class="swap-title ml-2">Your USD+ balance is: {{ balance.usdPlus }}</div>
          </template>
        </v-row>

        <v-row>
          <v-col lg="3" class="pt-10  hidden-sm-and-down hidden-md-and-down">
            <StatsWidget/>
          </v-col>
          <v-col lg="1">

          </v-col>

          <v-col lg="4" sm="12" md="12" cols="12">
            <v-row class="desc pr-5 pl-5 pt-10">
              <div>
                <p>Keep track on all interactions between you and Overnight</p>
                <p><b>Redeem anytime</b></p>
              </div>
            </v-row>
          </v-col>
        </v-row>

        <v-row justify="center" class="pr-5 pl-5">
          <v-col lg="4" class="tabs pa-1">
            <button v-bind:class="activeTabTx" @click="tab = 1">Transaction Log</button>
            <button v-bind:class="activeTabGas" @click="tab = 2 " disabled>Gas Fees Log</button>
          </v-col>
        </v-row>

        <v-row justify="center">
          <v-col lg="6" md="12" sm="12" class="pa-0 ma-0 " style="max-width: 650px">
            <TransactionLog v-if="tab === 1"/>
          </v-col>
        </v-row>

      </v-col>
    </v-row>
  </v-container>
</template>

<script>

import StatsWidget from "../components/common/StatsWidget";
import {mapGetters} from "vuex";
import TransactionLog from "../components/stats/TransactionLog";

export default {
  name: "StatsView",
  components: {TransactionLog, StatsWidget},
  data: () => ({
    tab: 1,
  }),


  computed: {

    ...mapGetters('profile', ['balance', 'loadingBalance']),

    activeTabTx: function () {
      return {
        'tab-button': this.tab === 1,
        'tab-button-in-active': this.tab !== 1,
      }
    },

    activeTabGas: function () {
      return {
        'tab-button': this.tab === 2,
        'tab-button-in-active': this.tab !== 2,
      }
    },


  },

  methods: {}

}
</script>

<style scoped>
.swap-title {
  color: #788C9F;
  font-weight: bold;
  font-size: 30px;
}

.desc {
  font-size: 15px;
  color: #171717;

}

.tab-button-in-active {
  color: #0A0952;
  cursor: pointer; /* Mouse pointer on hover */
  width: 50%;
  height: 40px;
  font-weight: 600;
  font-size: 18px;
  opacity: 0.8;

}

.tab-button-in-active:hover {
  opacity: 1;
  background-color: #FFFFFF;
  border: 1px solid #ECECEC;
  border-radius: 5px;
}

.tab-button {
  color: #0A0952;
  cursor: pointer; /* Mouse pointer on hover */
  width: 50%;
  height: 40px;
  font-weight: 600;
  font-size: 18px;
  border-radius: 5px;
  background-color: #FFFFFF;
  border: 1px solid #ECECEC;
  opacity: 0.8;
}

.card {
  border-radius: 15px;
  border: 1px solid #BBBBBB;
}

.tabs {
  background-color: #F4F5F9;
  border-radius: 8px;
}



</style>
