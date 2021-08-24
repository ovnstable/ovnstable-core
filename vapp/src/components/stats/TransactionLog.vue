<template>
  <v-col >
    <v-card class="mt-5 card elevation-0">
      <v-card-text>

        <v-container class="overflow-y-auto" style="height: 300px">
          <v-row :key="item.id" dense v-for="item in items" class="row">
            <v-col lg="2">
              {{item.sum}}
            </v-col>
            <v-col lg="7">
              {{item.name}}
            </v-col >
            <v-col lg="3">
              {{item.date}}
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

    items: [
      {
        id: 1,
        sum: '1500',
        name: 'OVN Redeemed for 1503 DAI',
        date: '26.06.2021',
      },
      {
        id: 2,
        sum: '1004',
        name: 'OVN Redeemed for 1004 USDC',
        date: '26.06.2021',
      },

      {
        id: 3,
        sum: '-',
        name: 'Daily interest void (less than gas fee)',
        date: '25.06.2021',
      },
      {
        id: 4,
        sum: '0.3',
        name: 'Daily interest calculated',
        date: '24.06.2021',
      },
      {
        id: 5,
        sum: '1500',
        name: 'OVN Redeemed for 1503 DAI',
        date: '26.06.2021',
      },
      {
        id: 6,
        sum: '1004',
        name: 'OVN Redeemed for 1004 USDC',
        date: '26.06.2021',
      },

      {
        id: 7,
        sum: '-',
        name: 'Daily interest void (less than gas fee)',
        date: '25.06.2021',
      },
      {
        id: 8,
        sum: '0.3',
        name: 'Daily interest calculated',
        date: '24.06.2021',
      },
      {
        id: 9,
        sum: '1500',
        name: 'OVN Redeemed for 1503 DAI',
        date: '26.06.2021',
      },
      {
        id: 10,
        sum: '1004',
        name: 'OVN Redeemed for 1004 USDC',
        date: '26.06.2021',
      },

      {
        id: 11,
        sum: '-',
        name: 'Daily interest void (less than gas fee)',
        date: '25.06.2021',
      },
      {
        id: 12,
        sum: '0.3',
        name: 'Daily interest calculated',
        date: '24.06.2021',
      },
    ],


  }),


  computed: {
    ...mapGetters("profile", ["contracts", "web3", 'account', ]),
  },

  created() {

  },

  methods: {

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
