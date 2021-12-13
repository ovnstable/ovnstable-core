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
          sm="8"

      >
        <v-row class="justify-center align-center pt-15">
          <div class="swap-title ml-2">USD+ Total Portfolio</div>
        </v-row>

        <v-row>
          <v-col lg="3" class="pt-10  hidden-sm-and-down hidden-md-and-down">
            <StatsWidget/>
          </v-col>
          <v-col lg="1">

          </v-col>

          <v-col lg="4" sm="12" md="12" cols="12">
            <v-row class="desc pr-5 pl-5 pt-10">
              Automated Overnight DeFi total asset portfolio management dashboards. Your assets are there.
              <br>
              <br>
              <p class="text-left font-weight-bold"> Redeem anytime</p>
            </v-row>
          </v-col>
        </v-row>

        <v-row justify="center" class="pr-5 pl-5">
          <v-col lg="4" class="tabs pa-1">
            <button v-bind:class="activeTabMint" @click="tab = 1">Payouts</button>
            <button v-bind:class="activeTabRedeem" @click="tab = 2 ">Portfolio</button>
          </v-col>
        </v-row>

        <v-row justify="center">
          <v-col lg="7" class="pa-0 ma-0" v-if="tab === 1">
            <HistoryTotalData />
          </v-col>
          <v-col lg="8" class="pa-0 ma-0" v-if="tab === 2">
            <CurrentTotalData/>
          </v-col>
        </v-row>

      </v-col>
    </v-row>
  </v-container>
</template>

<script>

import StatsWidget from "../components/common/StatsWidget";
import CurrentTotalData from "../components/dashboard/CurrentTotalData";
import HistoryTotalData from "../components/dashboard/HistoryTotalData";
import {mapGetters} from "vuex";

export default {
  name: "DashboardView",
  components: {HistoryTotalData, CurrentTotalData, StatsWidget},
  data: () => ({
    tab: 1,
  }),


  computed: {
    activeTabMint: function () {
      return {
        'tab-button': this.tab === 1,
        'tab-button-in-active': this.tab !== 1,
      }
    },

    activeTabRedeem: function () {
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
