<template>
    <v-container>
        <v-row justify="center">
            <h1>Governance Overview</h1>
        </v-row>

        <template v-if="overviewLoading">
            Loading...
        </template>

        <v-row v-else>
            <v-col lg="4">
                <v-card>
                    <v-card-title>Total votes</v-card-title>
                    <v-card-actions>
                        <h2>{{ overview.totalVotes }}</h2>
                    </v-card-actions>
                </v-card>
            </v-col>
            <v-col lg="4">
                <v-card>
                    <v-card-title>Votes Delegated</v-card-title>
                    <v-card-actions>
                        <h2>{{ overview.totalDelegated }}</h2>
                    </v-card-actions>
                </v-card>
            </v-col>
            <v-col lg="4">
                <v-card>
                    <v-card-title>Proposals</v-card-title>
                    <v-card-actions>
                        <h2>{{ overview.totalProposals }}</h2>
                    </v-card-actions>
                </v-card>
            </v-col>

        </v-row>

        <v-row>
            <v-col lg="3">
                <GovTokenPanel/>
            </v-col>
        </v-row>

    </v-container>
</template>

<script>
import {mapActions, mapGetters} from "vuex";
import GovTokenPanel from "../../components/governance/GovTokenPanel";

export default {
    name: "Overview",
    components: {GovTokenPanel},
    computed: {
        ...mapGetters('governance', ['overview', 'overviewLoading'])
    },


    methods: {}
}
</script>

<style scoped>

</style>
