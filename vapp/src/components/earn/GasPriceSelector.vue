<template>
    <v-expansion-panels class="ma-0 pa-0 box">
      <v-expansion-panel

      >
        <v-expansion-panel-header class="mt-1">
          <v-row>
            <v-col lg="5" >
              <span class="gas-title">Current Gas Settings</span>
            </v-col>
            <v-col lg="6" >
              <v-row justify="center" class="selected-title" style="height: 32px; " align="center">
                <div class="text-center">{{currentType}}</div>
              </v-row>
            </v-col>
          </v-row>
        </v-expansion-panel-header>
        <v-expansion-panel-content >
          <v-row class="mt-2 mb-2">
            <v-col lg="3">
              <v-row justify="center" class="selected-title" align="center" @click="selectGasSpeed('low', 'Low (60+ s)')">
                <div  class="text-center">Low (60+ s)</div>
              </v-row>
            </v-col>
            <v-col lg="3">
              <v-row justify="center" class="selected-title" align="center" @click="selectGasSpeed('standard', 'Normal')">
                <div  class="text-center">Normal</div>
              </v-row>
            </v-col>
            <v-col lg="3">
              <v-row justify="center" class="selected-title" align="center" @click="selectGasSpeed('fast', 'Top (5-20s)')">
                <div  class="text-center">Top (5-20s)</div>
              </v-row>
            </v-col>
            <v-col lg="3">
              <v-row justify="center" class="selected-title" align="center" @click="selectGasSpeed('ultra', 'Ultra')">
                <div  class="text-center">Ultra</div>
              </v-row>
            </v-col>
          </v-row>
        </v-expansion-panel-content>
      </v-expansion-panel>
    </v-expansion-panels>
</template>

<script>
import {mapActions, mapMutations} from "vuex";

export default {
  name: "GasPriceSelector",

  data: () => ({
    open: false,

    currentType: 'Top Speed (recommended)',
  }),
  computed: {},

  created() {
    this.refreshGasPrice();
  },

  methods: {


    ...mapActions('gasPrice', ['refreshGasPrice']),
    ...mapMutations('gasPrice', ['setGasPriceType'])  ,

    selectGasSpeed(type, text){
      this.currentType = text;
      this.setGasPriceType(type);
      this.refreshGasPrice();
    },
  },
}
</script>

<style scoped>

.gas-title {
  font-weight: bold;
  color: #40404C;
  font-size: 15px;
}

.box {
  width: 100%;
  height: 60px;
  border-radius: 10px;
  border: 1px solid #BBBBBB;
  font-size: 15px;
}
.box-down{
  border-bottom: 1px solid #BBBBBB;
  border-left: 1px solid #BBBBBB;
  border-right: 1px solid #BBBBBB;
  font-size: 15px;
  -moz-border-radius-bottomright: 10px;
  -moz-border-radius-bottomleft: 10px;

}

.selected-title:hover{
  background-color: #D5D5D5 !important;

}


.selected-title {
  transition: all 0.3s;
  cursor: pointer;
  width: 100%;
  border-radius: 25px;
  background-color: #ECECEC !important;
  font-weight: bold;
  color: #40404C;
  font-size: 14px;
  padding-top: 5px;
  padding-bottom: 5px;
}
</style>
