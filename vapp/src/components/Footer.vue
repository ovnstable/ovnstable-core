<template>
  <v-footer
      padless
  >
    <v-card
        class="flex"
        flat
        tile
    >
      <v-card-text>
          <v-row justify="end">
            <v-col lg="10"></v-col>
            <v-col lg="2">
              <v-icon color="black">mdi-github</v-icon>
              <v-icon color="black" class="ml-2">mdi-discord</v-icon>
              <v-icon color="black" class="ml-2">mdi-twitter</v-icon>
              <v-icon color="black" class="ml-2">mdi-email</v-icon>
            </v-col>
          </v-row>
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
