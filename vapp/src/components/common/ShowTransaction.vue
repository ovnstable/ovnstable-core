<template>
  <v-dialog width="500" v-model="modal" >
    <v-container class="notification pa-0 ma-0">
      <v-row dense class="pa-0 ma-0 ml-4">
        <v-col lg="1" cols="1" sm="1" md="1" align-self="center">
          <v-progress-circular
              :size="50"
              size="40"
              color="#F3A964"
              indeterminate
          ></v-progress-circular>
        </v-col>
        <v-col lg="11" cols="11" sm="11" md="11">
          <div class="text-block ml-4">
            {{ textSecond }}
            <br>
            {{ text }}
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
    ...mapGetters('showTransactions', ['text', 'textSecond', "show"]),


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
</style>
