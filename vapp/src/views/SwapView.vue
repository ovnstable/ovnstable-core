<template>

  <v-container
      class="fill-height"
      fluid
  >
    <v-row
        align="center"
        justify="center"
    >
      <v-col
          cols="12"
          sm="8"
          md="4"
      >
        <p class="text-center h2">Swap is in public alpha. Use at your own risk.</p>

        <v-card>

          <v-card-title>Swap</v-card-title>
          <v-card-text>
            <v-text-field outlined label="From"></v-text-field>
            <v-text-field outlined label="To"></v-text-field>
          </v-card-text>
          <v-card-actions>

            <v-row class="justify-center">
              <v-btn @click="swap()" icon >
                <v-icon>mdi-swap-horizontal-circle-outline</v-icon>
              </v-btn>
            </v-row>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  name: "SwapView",


  methods: {

    swap() {

    }
  }
}
</script>

<style scoped>

</style>
