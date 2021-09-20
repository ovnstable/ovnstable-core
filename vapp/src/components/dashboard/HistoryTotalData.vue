<template>
  <v-col>
    <v-card class="mt-5 card elevation-0">
      <v-card-text>

        <v-container>
          <v-row dense class="row-header">
            <v-col lg="3" style="text-align: start">
              Payable date (UTC)
            </v-col>

            <v-col lg="3">
              Sum (USDC)
            </v-col>

            <v-col lg="3">
              P/Y
            </v-col>
            <v-col lg="3">
              <img  :src="require('../../assets/poly.png')" height="20" width="20"/>
            </v-col>
          </v-row>

          <v-row  dense :key="item.id" v-for="item in payouts" class="row-item" justify="center">
            <v-col lg="3" style="text-align: start">
              {{ formatDate(item.date) }}
            </v-col>
            <v-col lg="3">
              {{ item.totallyAmountRewarded  }}$
            </v-col>
            <v-col lg="3">
              {{ $utils.formatMoney(item.distributionYield,6) }}%
            </v-col>

            <v-col lg="3">
              <v-icon @click="openOnScan(item)">mdi-eye</v-icon>
            </v-col>
          </v-row>
        </v-container>

      </v-card-text>
    </v-card>
  </v-col>
</template>

<script>
import {mapGetters} from "vuex";

export default {
  name: "HistoryTotalData",

  computed:{
    ...mapGetters('profile', ['payouts'])
  },

  methods: {

    openOnScan(item){
      let url = "https://polygonscan.com/tx/" + item.transactionHash;
      window.open(url, '_blank').focus();

    },

    formatDate(date){
      return this.$moment.utc(date).format( 'DD.MM.YYYY HH:mm:ss');
    }
  }
}
</script>

<style scoped>
.card {
  border-radius: 15px;
  border: 1px solid #BBBBBB;
}

.row-header{
  color: #171717;
  font-size: 20px;
  text-align: end;
  border-radius: 5px;
}
.row-item {
  color: #171717;
  font-size: 17px;
  text-align: end;
  cursor: pointer;
  border-radius: 5px;
}

.row-item:hover{
  background: #F4F5F9;
}

</style>
