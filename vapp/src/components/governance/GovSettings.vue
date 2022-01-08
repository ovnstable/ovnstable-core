<template>
<v-container class="ma-0 pa-0">
    <template v-if="settingsLoading">
        Loading ...
    </template>
    <v-card v-else>
        <v-card-title>Governor Settings</v-card-title>
        <v-card-text>
            <span>Address: {{contracts.governor.options.address}}</span>
        </v-card-text>
        <v-card-actions>
            <v-text-field  readonly v-model="settings.governor.votingDelay" label="Voting Delay (blocks)" outlined dense>
            </v-text-field>
            <v-text-field  readonly v-model="settings.governor.votingPeriod" label="Voting Period (blocks)" outlined dense>
            </v-text-field>
            <v-text-field  readonly v-model="settings.governor.proposalThreshold" label="ProposalThreshold (votes)" outlined dense>
            </v-text-field>
            <v-text-field  readonly v-model="settings.governor.quorumNumerator" label="Quorum" outlined dense>
            </v-text-field>
        </v-card-actions>

        <v-card-title>
            Timelock controller
        </v-card-title>
        <v-card-text>
            <span>Address: {{contracts.timelockController.options.address}}</span>
        </v-card-text>
        <v-card-actions>
            <v-text-field  readonly v-model="settings.timeLock.minDelay" label="Min delay (blocks)" outlined dense>
            </v-text-field>
        </v-card-actions>
    </v-card>
</v-container>
</template>

<script>
import {mapGetters} from "vuex";

export default {
    name: "GovSettings",

    data:()=>({


    }),

    computed:{
        ...mapGetters('web3', ['contracts']),
        ...mapGetters('governance',['settings', 'settingsLoading'])
    },

    methods:{

    }
}
</script>

<style scoped>

</style>
