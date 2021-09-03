<template>
  <v-col>
    <v-card class="card elevation-0">
      <v-card-title>{{title}}</v-card-title>
      <v-card-text>
        <v-container>
          <v-row dense>
            <v-col style="text-align: start">
              Active
            </v-col>

            <v-col>
              Position
            </v-col>

            <v-col>
              Market price
            </v-col>
            <v-col>
              Net Asset Value
            </v-col>

            <v-col>
              Liquidation price
            </v-col>

            <v-col>
              Liquidation value
            </v-col>
          </v-row>

          <v-row dense :key="item.symbol" v-for="item in items" class="row">

            <v-col style="text-align: start">
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
            <v-col lg="4" style="text-align: start">
              Total
            </v-col>
            <v-col lg="4">
                {{ netAssetValueTotal }}
            </v-col>
            <v-col lg="4">
              {{liquidationValueTotal}}
            </v-col>
          </v-row>

          <v-row dense class="row font-weight-bold">
            <v-col lg="4" style="text-align: start">
              Total OVN in circulation
            </v-col>
            <v-col lg="4">
                {{ total.ovn }}
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
  name: "Table",

  props: {
    title: {
      type: String
    },
    items: {
      type: Array,
      default: [],
    },

    total: {
      type: Object,
    }
  },

  data: () => ({
    menu: false,
    tab: null,

  }),


  computed: {
    ...mapGetters("profile", ["contracts", "web3", 'account', 'currentTotalData', 'balance']),

    liquidationValueTotal: function (){
      let value = 0;
      if (this.items) {

        for (let key in this.items) {
          let item = this.items[key];
          if (item.liquidationValue)
            value += parseFloat(item.liquidationValue);
        }

      }
      return this.$utils.formatMoney(value);

    },
    netAssetValueTotal: function () {

      let value = 0;
      if (this.items) {

        for (let key in this.items) {
          let item = this.items[key];
          if (item.bookPrice)
            value += parseFloat(item.bookPrice);
        }

      }
      return this.$utils.formatMoney(value);
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
  text-align: end;
}


</style>
