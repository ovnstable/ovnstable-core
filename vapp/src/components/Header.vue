<template>
  <v-app-bar
      dense
      app
      color="white"
      class="app-bar pa-4 pt-4"
  >

    <v-col lg="3" md="1" cols="2" sm="2" class="ml-0 pl-0">
      <Logo/>
    </v-col>

    <v-col lg="6" md="10" sm="8" cols="10" class="ma-0 pa-0">
      <Menu/>
    </v-col>


    <template v-if="loadingWeb3">
      <v-skeleton-loader
          type="actions"
      ></v-skeleton-loader>
      <v-skeleton-loader
          type="button"
      ></v-skeleton-loader>
    </template>
    <template v-else>
      <AccountBar v-if="!switchToPolygon"/>
      <SwitchToPolygon v-if="switchToPolygon"/>
      <Settings/>
    </template>


  </v-app-bar>
</template>
<script>
import {mapActions, mapGetters, mapMutations} from "vuex";
import SwitchToPolygon from "./common/SwitchToPolygon";
import AccountBar from "./common/AccountBar";
import Settings from "./common/Settings";
import Logo from "./common/Logo";
import Menu from "./common/Menu";


export default {
  name: 'Header',
  components: {Menu, Logo, Settings, AccountBar, SwitchToPolygon},
  data: () => ({}),


  computed: {
    ...mapGetters('web3', ['account', 'web3', 'contractNames', 'networkId', 'switchToPolygon', 'loadingWeb3']),

  },


  methods: {}
}
</script>
<style>

.app-bar {
  height: 78px !important;
  box-shadow: 0 2px 4px -1px rgba(122, 102, 102, 0.2), 0 4px 5px 0 rgba(215, 214, 214, 0.14), 0 1px 10px 0 rgba(255, 255, 255, 0.12) !important;
}


</style>
