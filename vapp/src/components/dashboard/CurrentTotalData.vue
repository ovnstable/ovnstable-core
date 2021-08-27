<template>
  <v-col>
    <v-card class="mt-5 card elevation-0">
      <v-card-text>

        <v-container>
          <v-row dense>
            <v-col>
              Инструмент
            </v-col>

            <v-col>
              Позиция (штук) (balances) (количество в токенах в волте) bookValue
            </v-col>

            <v-col>
              Цена Балансовая (USDC) price
            </v-col>
            <v-col>
              Mark2market (bookValue*price)
            </v-col>

            <v-col>
              Цена Ликвидационная (USDC) liquidationValue /bookvalue
            </v-col>

            <v-col>
              Mark2market  - ликвидационная стоимость портфеля liquidationValue
            </v-col>
          </v-row>

          <v-row dense :key="item.symbol" v-for="item in currentTotalData" class="row">

            <v-col>
              {{ item.symbol }}
            </v-col>
            <v-col>
              {{ item.bookValue }}
            </v-col>
            <v-col>
              {{ item.price }}
            </v-col>

            <v-col>
              {{ item.bookPrice }}
            </v-col>
            <v-col>
              {{ item.liquidationPrice }}
            </v-col>
            <v-col>
              {{ item.liquidationValue }}
            </v-col>
          </v-row>

          <v-row dense class="row pt-10">
            <v-col lg="7">
              Total Portfolio Value
            </v-col>
            <v-col lg="4">
              <v-row justify="end">
                {{ totalPortfolio }}
              </v-row>
            </v-col>
            <v-col lg="1"></v-col>
          </v-row>

          <v-row dense class="row font-weight-bold">
            <v-col lg="7">
              Total OVNGT
            </v-col>
            <v-col lg="4">
              <v-row justify="end">
                {{ balance.ovn }}
              </v-row>
            </v-col>
            <v-col lg="1"></v-col>
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
  name: "CurrentTotalData",
  data: () => ({
    menu: false,
    tab: null,


  }),


  computed: {
    ...mapGetters("profile", ["contracts", "web3", 'account', 'currentTotalData', 'balance']),

    totalPortfolio: function () {

      let value = 0;
      if (this.currentTotalData) {

        for (let key in this.currentTotalData) {
          let item = this.currentTotalData[key];
          if (item.liquidationValue)
            value += parseInt(item.liquidationValue);
        }

      }
      return value;
    },
  },

  created() {


  },

  methods: {}
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
