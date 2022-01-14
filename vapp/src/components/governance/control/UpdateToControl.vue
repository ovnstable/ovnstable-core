<template>
    <v-card>
        <v-card-title>
            <v-container>
                <v-row>
                    <v-col>
                        <h1>UpdateTo</h1>
                    </v-col>
                </v-row>
            </v-container>
        </v-card-title>

        <v-card-text>
            <v-row dense>
                <v-col>
                    <v-text-field v-model="request.contract" label="Contract Name" outlined dense>
                    </v-text-field>
                </v-col>
                <v-col>
                    <v-text-field v-model="request.address" label="New impl address" outlined dense>
                    </v-text-field>
                </v-col>
            </v-row>
        </v-card-text>
        <v-card-actions>
            <v-row dense>
                <v-col>
                    <v-btn @click="updateTo">
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
    name: "UpdateToControl",

    data: () => ({
        request: {
            contract: null,
            address: null,
        },
    }),

    computed: {
        ...mapGetters('web3', ['contracts']),

    },

    methods: {

        ...mapActions('governance', ['upgradeToAction']),

        updateTo(){
            this.upgradeToAction(this.request);
        },

    }
}
</script>

<style scoped>

</style>
