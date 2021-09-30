<template>
  <v-menu
      rounded="lg"
      offset-y
  >
    <template v-slot:activator="{ attrs, on }">

        <v-btn
            class="ml-2"
            v-bind="attrs"
            v-on="on"
            icon>
          <v-icon>mdi-cog</v-icon>
        </v-btn>
    </template>

    <v-card>

    </v-card>
  </v-menu>
</template>

<script>
export default {
  name: "Settings"
}
</script>

<style scoped>

</style>
