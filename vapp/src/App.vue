<template>
  <v-app id="app" v-if="isDrizzleInitialized">
    <Header/>
    <v-main>
      <v-container fluid>
        <router-view></router-view>
      </v-container>
    </v-main>
    <Footer/>
  </v-app>

</template>

<script>

import Header from "./components/Header";
import { mapGetters } from 'vuex';
import Footer from "./components/Footer";

export default {
  name: 'App',
  components: {Footer, Header},

  data() {
    return {
      drawer: true,
    }
  },

  computed: mapGetters('drizzle', ['isDrizzleInitialized']),


  created() {



  }


};
</script>
<style>

html {
  overflow-y: auto !important;
}

::-webkit-scrollbar-track {
  -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  background-color: #F5F5F5;
}

::-webkit-scrollbar {
  width: 12px;
  background-color: #F5F5F5;
}

::-webkit-scrollbar-thumb {
  border-radius: 10px;
  -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, .3);
  background-color: #555;
}

</style>
