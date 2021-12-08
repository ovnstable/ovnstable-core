<template>
<v-container>
    <v-card>
        <v-card-title>Change Weight</v-card-title>
        <v-card-actions>
            <v-container>

                <template v-for="asset in assets">
                    <v-row>
                        <v-col>
                            <v-text-field  readonly v-model="asset.address" label="Address" outlined dense>
                            </v-text-field>

                            <v-text-field  readonly v-model="asset.id" label="Name" outlined dense>
                            </v-text-field>

                            <v-text-field v-model="asset.weight" label="Weight" outlined dense>
                            </v-text-field>
                        </v-col>
                    </v-row>
                </template>

                <v-row>
                    <v-col>
                        <v-btn @click="changeWeightsAction">
                            Change
                        </v-btn>
                    </v-col>
                </v-row>
            </v-container>
        </v-card-actions>
    </v-card>
</v-container>
</template>

<script>
import {mapActions, mapGetters} from "vuex";

export default {
    name: "ChangeWeightPanel",

    data: () => ({

    }),

    computed: {
        ...mapGetters('governance', ['assets'])
    },
    methods: {

        ...mapActions('governance', ['changeWeights']),


        changeWeightsAction(){

            let weights = [];
            for (let i = 0; i < this.assets.length; i++) {
                let asset = this.assets[i];
                weights.push({
                    asset: asset.address,
                    minWeight: 0,
                    targetWeight: asset.weight,
                    maxWeight: 100000
                })
            }

            this.changeWeights(weights);
        }
    }
}
</script>

<style scoped>

</style>
