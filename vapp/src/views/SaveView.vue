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
          <v-col lg="4" class="pt-10 stats">
            <p>Total OVN Minted: 113 332 344</p>
            <p>OVN in circulation: <strong>79 886 800</strong></p>
            <p>Total OVN Burnt: 33 445 544</p>
          </v-col>
          <v-col lg="4">
            <v-row class="desc pr-5 pl-5 pt-10" justify="center">
              Deposit stablecoins to earn yield overnight with most conservative DeFi liquidity management solution
              <br>
              <br>
              Redeem anytime
            </v-row>
          </v-col>
        </v-row>

        <v-row justify="center" class="pr-5 pl-5">
          <v-col lg="4" class="tabs">
            <button class="tab-button">Mint</button>
            <button class="tab-button-in-active">Redeem</button>
          </v-col>
        </v-row>


        <v-row justify="center">
          <v-col lg="4">
            <v-card class="mt-5 card">
              <v-card-text>
                <v-tabs
                    color="black"
                    fixed-tabs
                    centered
                    v-model="tab"
                >
                  <v-tabs-slider></v-tabs-slider>

                  <v-tab :key="1">
                    Deposit
                  </v-tab>


                  <v-tab :key="2">
                    Redeem
                  </v-tab>


                  <v-tab :key="3">
                    Balance
                  </v-tab>

                </v-tabs>

                <v-tabs-items
                    v-model="tab" class="mt-5">

                  <v-tab-item :transition=false :key="1">
                    <Deposit/>
                  </v-tab-item>
                  <v-tab-item :transition=false :key="2">
                    <Redeem/>
                  </v-tab-item>
                  <v-tab-item :transition=false :key="3">
                    <Balance/>
                  </v-tab-item>

                </v-tabs-items>

              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>


import Deposit from "@/components/save/Deposit";
import Balance from "../components/save/Balance";
import Redeem from "../components/save/Redeem";

export default {
  name: "SaveView",
  components: { Redeem, Balance, Deposit},
  data: () => ({
    tab: null,
  }),

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

.stats {
  font-size: 15px;
}

.save-text {
  font-size: 2.5rem;
  color: #383838;
  font-family: Roboto, sans-serif;
}
</style>
