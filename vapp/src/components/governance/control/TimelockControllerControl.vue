<template>
    <v-card>
        <v-card-title>
            <v-container>
                <v-row>
                    <v-col>
                        <h1>Timelock Controller</h1>
                    </v-col>
                </v-row>
                <v-row>
                    <v-col>
                        <h5>Current address: {{ contracts.timelockController.options.address }}</h5>
                    </v-col>
                </v-row>
            </v-container>
        </v-card-title>

        <v-card-text>
            <v-row>
                <v-col>
                    <v-text-field v-model="value" label="Update delay" outlined dense>
                    </v-text-field>
                </v-col>
            </v-row>

        </v-card-text>
        <v-card-actions>
            <v-row>
                <v-col>
                    <v-btn @click="action">
                        Proposal
                    </v-btn>
                </v-col>
            </v-row>
        </v-card-actions>
    </v-card>
</template>

<script>
import {mapActions, mapGetters} from "vuex";

export default {
    name: "TimelockControllerControl",

    data: () => ({
        value: 0,
    }),

    computed: {
        ...mapGetters('web3', ['contracts'])
    },

    methods: {

        ...mapActions('governance', ['updateDelay']),

        action() {
            this.updateDelay(this.value);
        },
    }
}
</script>

<style scoped>

</style>
