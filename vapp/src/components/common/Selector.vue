<template>
<div>
  <v-img :src="item.image"></v-img>
  {{item.text}}
  <v-icon v-if="open">mdi-arrow-up</v-icon>
  <v-icon v-else>mdi-arrow-down</v-icon>
</div>
</template>

<script>
export default {
  name: "Selector",


  props: {

    value: {
      type: Object,
    },
    items: {
      type: Array,
      default: [],
    },

  },

  data:()=>({
    open: false,
    item: null,
  }),

  watch: {
    value: {
      handler(value) {
        this.item =value;
      },
    },
  },




  created() {
    if (this.items.length > 0) {
      this.item = this.items[0];
    }
  },


  computed:{

  },
  methods:{

  }
}
</script>

<style scoped>

</style>
