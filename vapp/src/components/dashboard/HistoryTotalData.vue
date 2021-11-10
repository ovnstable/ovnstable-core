<template>
  <v-col>
    <v-card class="mt-5 card-item elevation-0">
      <v-card-text>

        <template v-if="loadingPayouts">
          <v-skeleton-loader
              class="mx-auto"
              type="list-item-two-line"
          ></v-skeleton-loader>

          <v-skeleton-loader
              class="mx-auto"
              type="list-item-two-line"
          ></v-skeleton-loader>

          <v-skeleton-loader
              class="mx-auto"
              type="list-item-two-line"
          ></v-skeleton-loader>

          <v-skeleton-loader
              class="mx-auto"
              type="list-item-two-line"
          ></v-skeleton-loader>
        </template>
        <template v-else>
          <v-container>
            <v-row dense class="row-header">
              <v-col lg="3" style="text-align: start">
                Payable date (UTC)
              </v-col>

              <v-col lg="3">
                Daily profit (USDC per OVN)
              </v-col>

              <v-col lg="3">
                Annualized yield (% per year)
              </v-col>
              <v-col lg="3">
                View on PolygonScan
              </v-col>
            </v-row>

            <v-row dense :key="item.transactionHash" v-for="item in payouts" class="row-item" justify="center">
              <v-col lg="3" style="text-align: start">
                {{ formatDate(item.payableDate) }}
              </v-col>
              <v-col lg="3">
                {{ $utils.formatMoney(item.dailyProfit, 6) }}$
              </v-col>
              <v-col lg="3">
                {{ $utils.formatMoney(item.annualizedYield, 6) }}%
              </v-col>

              <v-col lg="3">
                <v-icon @click="openOnScan(item)">mdi-eye</v-icon>
              </v-col>
            </v-row>
          </v-container>
        </template>


      </v-card-text>
    </v-card>
  </v-col>
</template>

<script>
import {mapGetters} from "vuex";

export default {
  name: "HistoryTotalData",

  computed: {
    ...mapGetters('profile', ['payouts', 'loadingPayouts'])
  },

  methods: {

    openOnScan(item) {
      let url = "https://polygonscan.com/tx/" + item.transactionHash;
      window.open(url, '_blank').focus();

    },

    formatDate(date) {
      return this.$moment.utc(date).format('DD.MM.YYYY HH:mm:ss');
    }
  }
}
</script>

<style scoped>
.card-item {
  border-radius: 15px !important;
  border: 1px solid #BBBBBB !important;
}

.row-header {
  color: #171717;
  font-size: 17px;
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

.row-item:hover {
  background: #F4F5F9;
}

</style>
