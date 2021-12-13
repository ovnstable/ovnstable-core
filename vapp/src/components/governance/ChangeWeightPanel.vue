<template>
<v-container>
    <v-card>
        <v-card-title>Change Weight</v-card-title>
        <v-card-actions>
            <v-container>
                <v-data-table
                :items="assets"
                :headers="headers"
                >
                    <template v-slot:item.weight="{ item }">
                            <v-text-field dense outlined v-model="item.weight">
                            </v-text-field>
                    </template>
                </v-data-table>

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
        headers: [
            {text: 'Address', value: 'address',},
            {text: 'Name', value: 'id' },
            {text: 'Weight', value: 'weight' },
        ]
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
