<template>
  <v-col >
    <v-card class="mt-5 card elevation-0">
      <v-card-text>

        <v-container class="overflow-y-auto" style="height: 300px">
          <v-row :key="item.id" dense v-for="item in transactionLogs" class="row">
            <v-col lg="2">
              {{item.sum}}
            </v-col>
            <v-col lg="7">
              {{item.name}}
            </v-col >
            <v-col lg="3">
              {{formatDate(item.date)}}
            </v-col >
          </v-row>
        </v-container>

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
  data: () => ({

  }),


  computed: {
    ...mapGetters("profile", ["contracts", "web3", 'account', 'transactionLogs']),
  },

  created() {

  },

  methods: {
    formatDate(date){
      return this.$moment(date).format( 'DD.MM.YYYY');
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
