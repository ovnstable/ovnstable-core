<template>
  <v-dialog width="500" v-model="modal" :persistent="persistent">
    <v-container class="notification pa-0 ma-0">
      <v-row dense class="pa-0 ma-0 ml-4">
        <v-col lg="1" cols="1" sm="1" md="1" align-self="center">
          <v-progress-circular v-if="!failed"
              :size="50"
              size="40"
              color="#F3A964"
              indeterminate
          ></v-progress-circular>
          <v-icon v-else color="#EF4242" size="40">mdi-alert</v-icon>
        </v-col>
        <v-col lg="11" cols="11" sm="11" md="11">
          <div class="text-block ml-4">
            {{ textSecond }}  <span v-if="failed" class="text-failed pl-4">transaction failed</span>
            <br>
            <template v-if="!failed">
              {{ text }}
            </template>
            <span v-else class="text-failed">Click anywhere to continue...</span>
          </div>
        </v-col>
      </v-row>
    </v-container>
  </v-dialog>
</template>

<script>
import {mapActions, mapGetters} from "vuex";

export default {
  name: "ShowTransaction",

  data: () => ({

  }),

  computed: {
    ...mapGetters('showTransactions', ['text', 'textSecond', "show", 'failed', 'persistent']),


    modal: {
      get(){
        return this.show
      },
      set(newName){
        this.hide();
      }
    }
  },



  methods: {
    ...mapActions('showTransactions', ['hide']),

  }

}
</script>

<style scoped>
.text-block {

}

.notification {
  background-color: #242320;
  border-radius: 13px;
  color: #F3A964;
  font-weight: bold;
  height: 60px;
  overflow: hidden;
}
.text-failed{
  color: #EF4242;
}
</style>
