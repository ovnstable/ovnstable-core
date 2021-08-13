<template>
    <v-card
        class="mx-auto text-center main-card"
        dark
        max-width="600"
    >

    </v-card>
</template>

<script>
export default {
  name: "StatsView",

  data: () => ({
    value: [
      423,
      446,
      675,
      510,
      590,
      610,
      760,
    ],
  }),
}
</script>

<style scoped>

.main-card {
  background-color: rgba(68, 55, 55, 0.7);
}
</style>
