<template>
<v-container>
    <v-row justify="center">
        <h1>Governance Overview</h1>
    </v-row>

    <template v-if="overviewLoading">
        Loading...
    </template>

    <v-row v-else>
        <v-col lg="3">
            <v-card>
                <v-card-title>Votes Delegated </v-card-title>
                <v-card-actions>
                    {{overview.totalVotes}}
                </v-card-actions>
            </v-card>
        </v-col>
        <v-col lg="3">
            <v-card>
                <v-card-title>Votes Delegated</v-card-title>
                <v-card-actions>

                </v-card-actions>
            </v-card>
        </v-col>
        <v-col lg="3">
            <v-card>
                <v-card-title>Proposals</v-card-title>
                <v-card-actions>

                </v-card-actions>
            </v-card>
        </v-col>
        <v-col lg="3">
            <v-card>
                <v-card-title>IDLE Circulating</v-card-title>
                <v-card-actions>

                </v-card-actions>
            </v-card>
        </v-col>
    </v-row>


</v-container>
</template>

<script>
import {mapActions, mapGetters} from "vuex";

export default {
    name: "Overview",


    computed: {
        ...mapGetters('governance', ['overview', 'overviewLoading'])
    },


    methods:{

    }
}
</script>

<style scoped>

</style>
