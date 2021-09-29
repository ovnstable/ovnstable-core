<template>
  <div  class="addBtn"  @click="addToken">{{text}}
    <v-icon color="green">mdi-plus</v-icon>
  </div>
</template>

<script>
export default {
  name: "AddTokenBtn",

  props:{
    addToken: Function,
    text: String,
  }
}
</script>

<style scoped>
.addBtn {
  cursor: pointer;
  padding: 5px;
  padding-left: 15px;
  padding-right: 15px;
  color: #40404C;
  font-size: 13px;
  font-weight: bold;
  border-radius: 15px;
  border: 1px solid #BBBBBB;
  transition: all 0.3s;

}

.addBtn:hover{
  background-color: #D5D5D5 !important;
}
</style>
