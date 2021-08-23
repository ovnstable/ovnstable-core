<template>

  <v-dialog v-model="show">
    <v-progress-circular
        :size="50"
        color="primary"
        indeterminate
    ></v-progress-circular>

    {{text}}
  </v-dialog>
</template>

<script>
export default {
  name: "ShowTransaction",

  data:()=>({
    show: false,
    text: null,
  }),

  created() {
  },

  methods:{
    setText(){

    },
  }

}
</script>

<style scoped>

</style>
