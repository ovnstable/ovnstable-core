<template>
  <div v-if="isDrizzleInitialized">

    <p><strong>Account:</strong> {{ activeAccount }}</p>
    <p><strong>Your ETH balance:</strong> {{ Number(getEthBalance).toFixed(4) }} ETH</p>
    <p><strong>Your OVNGT balance:</strong> {{ Number(balance).toFixed(2) }} OVNGT</p>

  </div>
</template>

<script>
import {mapActions, mapGetters} from "vuex";

export default {
  name: "Balance",

  computed: {
    ...mapGetters("accounts", ["activeAccount", "activeBalance"]),
    ...mapGetters('drizzle', ['isDrizzleInitialized', 'drizzleInstance']),
    ...mapGetters("profile", ["getTestTokenBalance"]),
    ...mapGetters('contracts', ['getContractData']),


    balance() {
      return this.getContractData({
        contract: 'Exchange',
        method: 'balance',
        methodArgs: [this.activeAccount]
      })
    },


    getEthBalance() {
      return this.drizzleInstance.web3.utils.fromWei(this.activeBalance, "ether");
    }
  },

  created() {
    this.fetchTestTokenBalance();
  },
  methods: {
    ...mapActions("profile", ["fetchTestTokenBalance"])

  },
}
</script>

<style scoped>

</style>
