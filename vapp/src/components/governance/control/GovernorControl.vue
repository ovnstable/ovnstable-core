<template>
    <v-card>
        <v-card-title>
            <v-container>
                <v-row>
                    <v-col>
                        <h1>Governor Controller</h1>
                    </v-col>
                </v-row>
                <v-row v-if="contracts">
                    <v-col>
                        <h5>Current address: {{ contracts.governor.options.address }}</h5>
                    </v-col>
                </v-row>
            </v-container>
        </v-card-title>

        <v-card-text>
            <v-row>
                <v-col>
                    <v-text-field v-model="item.votingDelay" label="Voting Delay (blocks)" outlined dense>
                    </v-text-field>
                </v-col>
                <v-col>
                    <v-text-field v-model="item.votingPeriod" label="Voting Period (blocks)" outlined dense>
                    </v-text-field>
                </v-col>
            </v-row>
            <v-row>
                <v-col>
                    <v-text-field v-model="item.proposalThreshold" label="ProposalThreshold" outlined dense>
                    </v-text-field>
                </v-col>
                <v-col>
                    <v-text-field v-model="item.updateQuorumNumerator" label="Quorum" outlined dense>
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
    name: "GovernorControl",

    data: () => ({

        item: {
            votingDelay: null,
            votingPeriod: null,
            proposalThreshold: null,
            updateQuorumNumerator: null,
        },
    }),

    computed: {
        ...mapGetters('web3', ['contracts'])
    },

    methods: {

        ...mapActions('governance', ['updateDelay', 'updateGovernanceSettings']),

        action() {

            this.updateGovernanceSettings(this.item);
        },
    }
}
</script>

<style scoped>

</style>
