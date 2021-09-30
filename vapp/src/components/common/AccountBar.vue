<template>
  <v-container >
    <v-row justify="end">
      <v-col>
        <v-row v-if="!account" justify="end" align="center">
          <button v-on:click="connectWalletAction" class="btn">Connect Wallet
            <v-icon color="#C7C7C7" class="ml-1">mdi-logout</v-icon>
          </button>
        </v-row>
      </v-col>
      <v-col lg="7" v-if="account">
        <v-row class="account" style="height: 50px" align="center">
          <div>OVN: <strong>{{ balance.ovn }}</strong></div>
          <div class="pl-5"> {{ accountShort }}</div>
        </v-row>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import {mapActions, mapGetters} from "vuex";

export default {
  name: "AccountBar",

  computed: {
    ...mapGetters('profile', ['balance']),
    ...mapGetters('web3', ['account', 'web3', 'contractNames', 'networkId']),

    accountShort: function () {

      if (this.account) {
        return this.account.substring(0, 10) + '...';
      }
      return null;
    },

  },

  methods: {

    ...mapActions('web3', ['connectWallet']),


    connectWalletAction() {
      this.connectWallet();
    }
  }
}
</script>

<style scoped>
.account {
  cursor: pointer; /* Mouse pointer on hover */
  color: #686868;
  font-weight: 600;
  font-size: 14px;
  padding: 10px;
  padding-top: 5px;
  padding-bottom: 5px;
  border: 1px solid #ECECEC;
  border-radius: 10px;
}

.btn {
  cursor: pointer; /* Mouse pointer on hover */
  color: #444444;
  width: 210px;
  height: 45px;
  font-weight: 600;
  font-size: 14px;
  border: 1px solid #c7c7c7;
  border-radius: 10px;
  opacity: 0.8;
}


/* Darker background on mouse-over */
.btn:hover {
  opacity: 1;
  transition: 0.3s;
  background-color: rgba(220, 220, 220, 0.9);
}
</style>
