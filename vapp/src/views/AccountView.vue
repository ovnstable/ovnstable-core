<template>

  <v-card>
    <p>Address: {{account.address}}</p>
    <p>Balance: {{account.balance}}</p>

    {{web3.currentProvider}}
  </v-card>
</template>

<script>
import {mapGetters} from "vuex";

export default {
  name: "AccountView",

  computed: {

    ...mapGetters(['account'])
  }
}
</script>

<style scoped>

</style>
