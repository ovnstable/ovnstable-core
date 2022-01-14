<template>
    <v-card>
        <v-card-title>
            <v-container>
                <v-row>
                    <v-col>
                        <h1>Exchange</h1>
                    </v-col>
                </v-row>
                <v-row>
                    <v-col>
                        <h5>Current address: {{ contracts.exchange.options.address }}</h5>
                    </v-col>
                </v-row>
            </v-container>
        </v-card-title>

        <v-card-text>
            <v-row dense>
                <v-col>
                    <v-text-field v-model="buyFee" label="Buy Fee" outlined dense>
                    </v-text-field>
                </v-col>
                <v-col>
                    <v-text-field v-model="buyFeeDenominator" label="Buy fee denominator" outlined dense>
                    </v-text-field>
                </v-col>
            </v-row>
        </v-card-text>
        <v-card-actions>
            <v-row dense>
                <v-col>
                    <v-btn @click="changeFeeBuyAction">
                        Proposal
                    </v-btn>
                    <v-btn @click="runPayout">
                        Payout
                    </v-btn>
                </v-col>
            </v-row>
        </v-card-actions>
    </v-card>
</template>

<script>
import {mapActions, mapGetters} from "vuex";

export default {
    name: "ExchangeControl",

    data: () => ({
        buyFee: null,
        buyFeeDenominator: null,
    }),

    computed: {
        ...mapGetters('web3', ['contracts']),

    },

    methods: {

        ...mapActions('governance', ['changeFeeBuy', 'runPayoutAction']),

        runPayout(){
            this.runPayoutAction();
        },

        changeFeeBuyAction() {
            this.changeFeeBuy({fee: this.buyFee, feeDenominator: this.buyFeeDenominator})
        }
    }
}
</script>

<style scoped>

</style>
