<template>
    <v-container>
        <v-row justify="center">
            <h1>Proposals Overview</h1>
        </v-row>
        <v-row justify="center">
            <h2>Total count: {{proposals.length}}</h2>
        </v-row>

        <template v-if="proposalsLoading">
            Loading...
        </template>
        <template v-else>
            <ProposalList/>
        </template>

    </v-container>
</template>

<script>
import ProposalList from "../../components/governance/ProposalList";
import {mapGetters} from "vuex";
export default {
    name: "Proposals",
    components: {ProposalList},
    data:()=>({


    }),

    computed:{
        ...mapGetters('governance', ['proposalsLoading', 'proposals'])
    },

    methods:{

    }
}
</script>

<style scoped>

</style>
