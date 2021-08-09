<template>
  <v-footer
      padless
  >
    <v-card
        class="flex"
        flat
        tile
    >

      <v-card-text class="py-2 black--text text-center ">
        {{ new Date().getFullYear() }} — <strong c>OverNight</strong>
      </v-card-text>
    </v-card>
  </v-footer>
</template>

<script>
export default {
  name: "Footer"
}
</script>

<style scoped>

</style>
