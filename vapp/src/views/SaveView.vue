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
        <v-row class="justify-center align-center pt-15">
          <v-icon class="save-text"  >mdi-piggy-bank</v-icon>
          <p class="text-center  pt-5 save-text ">Save</p>
        </v-row>
        <v-card class="mt-15">
          <v-card-text>
            <v-tabs
                color="black"
                fixed-tabs
                centered
                v-model="tab"
            >
              <v-tabs-slider></v-tabs-slider>

              <v-tab :key="1">
                Deposit
              </v-tab>

              <v-tab disabled :key="2">
                Redeem
              </v-tab>

            </v-tabs>

            <v-tabs-items
                          v-model="tab" class="mt-5">

              <v-tab-item :transition=false :key="1">
                <Deposit/>
              </v-tab-item>
              <v-tab-item :transition=false :key="2"></v-tab-item>

            </v-tabs-items>

          </v-card-text>
        </v-card>

      </v-col>
    </v-row>
  </v-container>
</template>

<script>


import Deposit from "@/components/save/Deposit";

export default {
  name: "SaveView",
  components: {Deposit},
  data: () => ({
    tab: null,
  }),

  methods: {}

}
</script>

<style scoped>

.save-text {
  font-size: 2.5rem;
  font-weight: bold;
  color: #383838;
}
</style>
