<template>
    <v-card>
        <v-card-title>
            <v-container>
                <v-row>
                    <h1>Exchange</h1>
                </v-row>
                <v-row>
                    <h2>Address: {{ contracts.exchange.options.address }}</h2>
                </v-row>
            </v-container>
        </v-card-title>

        <v-card-actions>
            <v-text-field v-model="buyFee" label="Buy Fee" outlined dense>
            </v-text-field>
            <v-text-field v-model="buyFeeDenominator" label="Buy fee denominator" outlined dense>
            </v-text-field>

            <v-btn @click="changeFeeBuyAction">
                Change
            </v-btn>
        </v-card-actions>
    </v-card>
</template>

<script>
import {mapActions, mapGetters} from "vuex";

export default {
    name: "Exchange",

    data: () => ({
        buyFee: null,
        buyFeeDenominator: null,
    }),

    computed: {
        ...mapGetters('web3', ['contracts'])
    },

    methods: {

        ...mapActions('governance', ['changeFeeBuy']),


        changeFeeBuyAction() {
            this.changeFeeBuy({fee: this.buyFee, feeDenominator: this.buyFeeDenominator})
        }
    }
}
</script>

<style scoped>

</style>
