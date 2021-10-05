<template>
  <v-container>
    <v-row justify="end">
      <button v-on:click="goToPolygon" class="switcher"><span>Switch to Polygon</span>
        <v-icon>mdi-login</v-icon>
      </button>
    </v-row>

  </v-container>

</template>

<script>
import {mapActions} from "vuex";

export default {
  name: "SwitchToPolygon",


  methods: {

    ...mapActions('web3', ['setNetwork']),

    goToPolygon() {
      this.setNetwork(137)
    }
  }
}
</script>

<style scoped>

.switcher {
  cursor: pointer; /* Mouse pointer on hover */
  color: #444444;
  width: 210px;
  height: 45px;
  font-weight: 600;
  font-size: 14px;
  border: 1px solid #c7c7c7;
  border-radius: 10px;
  opacity: 0.8;
}

</style>
