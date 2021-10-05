<template>
  <v-dialog
      :value="show"
      :width="width"
      @input="close"
      :persistent="persistent"
      scrollable>
    <v-card color="container_body">
      <v-toolbar color="container_header"
      >
        <v-toolbar-title>
          Account
        </v-toolbar-title>
        <v-btn icon class="ml-auto" @click="close">
          <v-icon color="error">mdi-close</v-icon>
        </v-btn>
      </v-toolbar>
      <v-card-text class="px-5 pt-5">
        <v-text-field dense label="Account" v-model="account" readonly outlined></v-text-field>

        <v-row>
          <v-col lg="8">
            Recent Transactions
          </v-col>
          <v-col lg="2">
            <v-btn small text @click="clearTransaction">clear all</v-btn>
          </v-col>
        </v-row>
        <v-row class="row mt-2" v-for="item in transactions">
          <v-col lg="10">
            <div class="transaction-link" @click="openPolygonScan(item.hash)">{{ item.text }} ↗</div>
          </v-col>
          <v-col lg="2">
            <v-icon v-if="item.pending">mdi-progress-question</v-icon>
            <v-icon color="green" v-else>mdi-check</v-icon>
          </v-col>

        </v-row>
      </v-card-text>

    </v-card>
  </v-dialog>
</template>

<script>
import {mapActions, mapGetters} from "vuex";

export default {
  name: "AccountProfile",

  props: {

    persistent: {
      type: Boolean,
      default: false,
    },

    value: {
      type: Boolean,
      default: false,
    },
    width: {
      type: String,
      default: '400',
    }
  },

  computed: {

    ...mapGetters('web3', ['account']),
    ...mapGetters('accountProfile', ['show']),
    ...mapGetters('transaction', ['transactions'])
  },


  methods: {

    ...mapActions('accountProfile', ['hideAccountProfile']),
    ...mapActions('transaction', ['clearTransaction']),


    openPolygonScan(hash){
      window.open(`https://polygonscan.com/tx/${hash}`, '_blank').focus();
    },

    close() {
      this.hideAccountProfile();

      this.$emit('input', false);
      this.$emit('m-close');
    },
  },


}
</script>

<style scoped>

.row{
  font-size: 17px;
}

.container_body {
  border-radius: 20px;
}

.transaction-link{
  cursor: pointer;
}
.transaction-link:hover{
  text-decoration: underline;

}
</style>
