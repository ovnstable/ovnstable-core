<template>
  <div v-if="isDrizzleInitialized" class="pa-5">
    <v-row dense>
      <v-col cols="2">
        <v-subheader class="font-weight-bold">Account</v-subheader>
      </v-col>
      <v-col cols="10">
        <v-text-field  outlined color="black" dense v-model="activeAccount" readonly></v-text-field>
      </v-col>
    </v-row>

    <v-row dense>
      <v-col cols="2">
        <v-subheader class="font-weight-bold">OVNGT</v-subheader>
      </v-col>
      <v-col cols="10">
        <v-text-field  outlined color="black" dense v-model="ovngtTokenBalance" readonly></v-text-field>
      </v-col>
    </v-row>


  </div>
</template>

<script>
import {mapActions, mapGetters} from "vuex";

export default {
  name: "Balance",

  computed: {
    ...mapGetters("accounts", ["activeAccount", "activeBalance"]),
    ...mapGetters('drizzle', ['isDrizzleInitialized', 'drizzleInstance']),
    ...mapGetters("profile", ["usdcTokenBalance", "ovngtTokenBalance"]),
    ...mapGetters('contracts', ['getContractData']),


    getEthBalance() {
      return this.drizzleInstance.web3.utils.fromWei(this.activeBalance, "ether");
    }
  },

  created() {
    this.getUsdcTokenBalance();
    this.getOvngtTokenBalance();
  },
  methods: {
    ...mapActions("profile", ["getUsdcTokenBalance"]),
    ...mapActions("profile", ["getOvngtTokenBalance"])

  },
}
</script>

<style scoped>

</style>
