<template>
  <div v-if="isDrizzleInitialized">

    <p>Account: {{activeAccount}}</p>
    <p>Balance: {{activeBalance}}</p>
  </div>
</template>

<script>
import {mapGetters} from "vuex";

export default {
  name: "Balance",

  computed: {
    ...mapGetters("accounts", ["activeAccount", "activeBalance"]),
    ...mapGetters('drizzle', ['isDrizzleInitialized']),

  }

}
</script>

<style scoped>

</style>
