<template>
  <v-row dense class="logo" @click="clickLogo">
    <div style="width: 40px; height: 40px">
      <v-img :src="require('../../assets/ovn.png')"></v-img>
    </div>
    <div class="logo-title ml-2 mt-0 hidden-md-and-down">OVERNIGHT</div>
    <span>Beta</span>
  </v-row>
</template>

<script>
export default {
  name: "Logo",

  methods:{
    clickLogo() {
      window.open('https://ovnstable.io/', '_blank').focus();
    },
  }
}
</script>

<style scoped>
.logo {
  width: 400px;
  cursor: pointer;
}

.logo-title {
  color: #40404C;
  font-size: 25px;
  font-weight: 800;
  letter-spacing: 3px;
}
</style>
