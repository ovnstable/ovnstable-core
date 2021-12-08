<template>
    <v-container>
        <v-card>
            <v-card-title>Minting</v-card-title>
            <v-card-actions>
                <v-container>
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
                    <v-row>
                        <v-col>
                            <v-btn @click="mintGovTokens">
                                Mint
                            </v-btn>
                        </v-col>
                    </v-row>
                </v-container>
            </v-card-actions>
        </v-card>
    </v-container>
</template>

<script>
import {mapActions} from "vuex";

export default {
    name: "GovTokenPanel",

    data: () => ({
        sum: 0,
        address: null,
    }),

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
