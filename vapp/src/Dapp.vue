<template>
<div>
  <Header/>
  <v-main>
    <v-container fluid>
      <router-view></router-view>
    </v-container>
  </v-main>
  <Footer/>
</div>
</template>

<script>

import Header from "./components/Header";
import Footer from "./components/Footer";
export default {
  name: "Dapp",
  components: {Footer, Header}
}
</script>

<style scoped>

</style>
