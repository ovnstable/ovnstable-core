<template>
    <v-card>
        <v-card-title>
            <v-container>
                <v-row>
                    <v-col>
                        <h1>OVN Token</h1>
                    </v-col>
                </v-row>
                <v-row>
                    <v-col>
                        <h5>Current address: {{ contracts.govToken.options.address }}</h5>
                    </v-col>
                </v-row>
            </v-container>
        </v-card-title>

        <v-card-text>
            <v-row>
                <v-col>
                    <v-text-field v-model="sum" label="Sum" outlined dense>
                    </v-text-field>
                </v-col>
            </v-row>
            <v-row>
                <v-col>
                    <v-text-field v-model="address" label="Address" outlined dense>
                    </v-text-field>
                </v-col>
            </v-row>

        </v-card-text>
        <v-card-actions>
            <v-row>
                <v-col>
                    <v-btn @click="mintGovTokens">
                        Mint
                    </v-btn>
                </v-col>
            </v-row>
        </v-card-actions>
    </v-card>
</template>

<script>
import {mapActions, mapGetters} from "vuex";

export default {
    name: "GovTokenControl",

    data: () => ({
        sum: 0,
        address: null,
    }),

    computed: {
        ...mapGetters('web3', ['contracts'])
    },

    methods: {

        ...mapActions('governance', ['minting']),

        mintGovTokens() {
            this.minting({sum: this.sum, account: this.address});
        },
    }
}
</script>

<style scoped>

</style>
