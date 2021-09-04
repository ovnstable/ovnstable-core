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
            <v-btn icon href="https://github.com/ovnstable" target="_blank">
              <v-icon color="black" >mdi-github</v-icon>
            </v-btn>

            <v-btn icon href="https://github.com/ovnstable" target="_blank">
              <v-icon color="black" >mdi-discord</v-icon>
            </v-btn>

            <v-btn icon href="https://github.com/ovnstable" target="_blank">
              <v-icon color="black" >mdi-twitter</v-icon>
            </v-btn>

            <v-btn icon href="https://github.com/ovnstable" target="_blank">
              <v-icon color="black" >mdi-email</v-icon>
            </v-btn>
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
