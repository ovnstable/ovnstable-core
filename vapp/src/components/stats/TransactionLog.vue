<template>
  <div>
    <v-card class="mt-5 card elevation-0">
      <v-card-text v-if="account" class="mobile">

        <template v-if="transactionLogsLoader">
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
        <v-container v-else class="overflow-y-auto " style="height: 300px">
          <v-row :key="item.id" dense v-for="item in transactionLogs" class="row item">
            <v-col lg="2" cols="2">
              {{ item.sum }}
            </v-col>
            <v-col lg="7" cols="7">
              {{ item.name }}
            </v-col>
            <v-col lg="3" cols="3">
              {{ formatDate(item.date) }}
            </v-col>
          </v-row>
        </v-container>

      </v-card-text>

      <v-card-text v-else class="text-center">
        You need to connect to a wallet
      </v-card-text>
    </v-card>
  </div>

</template>

<script>
import {mapGetters} from "vuex";
import web3 from "web3";
import utils from 'web3-utils';

export default {
  name: "TransactionLog",
  data: () => ({}),


  computed: {
    ...mapGetters("profile", ['transactionLogs', "transactionLogsLoader"]),
    ...mapGetters("web3", ['account']),
  },

  created() {

  },

  methods: {
    formatDate(date) {
      return this.$moment(date).format('DD.MM.YYYY');
    }
  }
}
</script>

<style scoped lang="scss">


.card {
  border-radius: 15px;
  border: 1px solid #BBBBBB;
}

.row {
  color: #171717;
  font-size: 17px;
}

@media all and (min-width:0px) and (max-width: 600px) {

  .item {
    font-size: 13px;
  }

  .mobile {
    margin: 0 0 0 0 ;
    padding: 0 0 0 0 ;
  }

}

</style>
