<template>

  <div class="switcher" @click="goToPolygon">
    <span>Switch to Polygon</span> <v-icon>mdi-login</v-icon>
  </div>
</template>

<script>
import {mapActions} from "vuex";

export default {
  name: "SwitchToPolygon",


  methods:{

    ...mapActions('web3', ['setNetwork']),

    goToPolygon(){
      this.setNetwork(137)
    }
  }
}
</script>

<style scoped>

.switcher {
  cursor: pointer; /* Mouse pointer on hover */
  color: #686868;
  height: 35px;
  font-weight: 600;
  font-size: 14px;
  padding: 5px;
  border: 1px solid #ECECEC;
  border-radius: 10px;
}
</style>
