<template>
  <div class="stats">
    <v-col lg="12">
      <v-row dense class="row" align="center">
        <v-col lg="6">
          Total OVN Minted:
        </v-col>
        <v-col lg="4" md="8" class="number">
          {{ numberWithSpaces(totalOvn.totalMint) }}
        </v-col>
      </v-row>
      <v-row dense class="row fatty pt-2 pb-2" align="center">
        <v-col lg="6" md="2">
          OVN in circulation:
        </v-col>
        <v-col lg="4" md="8" class="number">
          <strong>{{ numberWithSpaces(totalOvn.totalSupply) }}</strong>
        </v-col>
        <v-col lg="2">
        </v-col>
      </v-row>

      <v-row dense class="row" align="center">
        <v-col lg="6">
          Total OVN Burnt:
        </v-col>
        <v-col lg="4" md="8" class="number">
          {{ numberWithSpaces(totalOvn.totalBurn) }}
        </v-col>

        <v-col>

        </v-col>
      </v-row>

      <v-row class="refresh">
        <v-col lg="10">
          <v-row justify="end">
            Refreshed daily
          </v-row>
        </v-col>
        <v-col lg="4">
        </v-col>
      </v-row>
    </v-col>
  </div>
</template>

<script>
import {mapGetters} from "vuex";

export default {
  name: "StatsWidget",

  data: () => ({

  }),


  computed: {
    ...mapGetters('profile', ['totalOvn'])
  },

  methods: {
    numberWithSpaces(x) {
      return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    }
  }
}
</script>

<style scoped>

.refresh {
  color: #909399;
  font-size: 10px;
}

.row {

  padding-left: 15px;
  padding-right: 15px;
}

.fatty {
  border-radius: 8px;
  background-color: #ECECEC;
}

.number {
  text-align: end;
}

.stats {
  max-width: 330px;
  font-size: 15px;
}
</style>
