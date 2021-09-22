<template>
  <v-col>
    <v-card class="mt-5 card elevation-0">
      <v-card-text v-if="account">

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
        <v-container v-else class="overflow-y-auto" style="height: 300px">
          <v-row :key="item.id" dense v-for="item in transactionLogs" class="row">
            <v-col lg="2">
              {{ item.sum }}
            </v-col>
            <v-col lg="7">
              {{ item.name }}
            </v-col>
            <v-col lg="3">
              {{ formatDate(item.date) }}
            </v-col>
          </v-row>
        </v-container>

      </v-card-text>

      <v-card-text v-else class="text-center">
        You need to connect to a wallet
      </v-card-text>
    </v-card>


  </v-col>

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


</style>
