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
          sm="8"
          md="4"
      >
        <v-row class="justify-center align-center pt-15">
          <img :src="require('../assets/swap.png')">
          <div class="swap-title ml-2">Swap</div>
        </v-row>

        <v-row>
          <v-col lg="3" class="pt-10">
           <StatsWidget/>
          </v-col>
          <v-col lg="1"></v-col>

          <v-col lg="4">
            <v-row class="desc pr-5 pl-5 pt-10" >
              Deposit stablecoins to earn yield overnight with most conservative DeFi liquidity management solution
              <p class="text-left font-weight-bold"> Redeem anytime</p>
            </v-row>
          </v-col>
        </v-row>

        <v-row justify="center" class="pr-5 pl-5">
          <v-col lg="4" class="tabs pa-1">
            <button v-bind:class="activeTabMint"  @click="tab = 1">Mint</button>
            <button v-bind:class="activeTabRedeem" @click="tab = 2 ">Redeem</button>
          </v-col>
        </v-row>

        <v-row justify="center">
         <Mint v-if="tab === 1"/>
          <Redeem v-if="tab === 2"/>
        </v-row>

      </v-col>
    </v-row>
  </v-container>
</template>

<script>


import Redeem from "../components/swap/Redeem";
import Mint from "../components/swap/Mint";
import StatsWidget from "../components/common/StatsWidget";

export default {
  name: "SwapView",
  components: {StatsWidget, Mint, Redeem},
  data: () => ({
    tab: 1,

    total: {
      minted: 113332344,
      circulation: 79886800,
      burnt: 33445544,
    },
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
    }
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


.save-text {
  font-size: 2.5rem;
  color: #383838;
  font-family: Roboto, sans-serif;
}
</style>
