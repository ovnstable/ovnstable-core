<template>
  <v-app id="app">
    <router-view></router-view>
  </v-app>

</template>

<script>


import {mapActions, mapGetters, mapMutations} from "vuex";

export default {
  name: 'App',

  data: () => ({}),

  computed: {

  },



};
</script>
<style>
@import url('https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900&display=swap');

html {
  overflow-y: auto !important;
}

.v-application {
  font-family: 'Lato', sans-serif !important;
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

.Vue-Toastification__toast--success.toast {
  padding-top: 5px;
  padding-bottom: 5px;
  padding-left: 25px;
  padding-right: 20px;
}

</style>
