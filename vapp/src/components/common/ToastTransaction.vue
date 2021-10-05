<template>
  <v-container class="ma-0 pa-0" >
    <v-row dense style="margin-left: 10px">
      <span class="text-toast">{{text}}</span>
    </v-row>
    <v-row dense>
      <v-btn text color="#FFFFFF" @click.stop="clicked">View on PolygonScan</v-btn>
    </v-row>
  </v-container>
</template>
<script>
export default {
  name: "ToastTxFinish",

  props: ["text", 'tx'],
  methods: {
    clicked() {
      window.open(`https://polygonscan.com/tx/${this.tx}`, '_blank').focus();
    }
  }
};
</script>
<style>

.text-toast{
  color: #FFFFFF;
  font-size: 18px;
}

</style>
