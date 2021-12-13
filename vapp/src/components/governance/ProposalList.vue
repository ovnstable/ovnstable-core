<template>
    <v-data-table

        :items="proposals"
        :headers="headers"
    >
        <template v-slot:item.votes="{ item }">
            <p>For {{ item.forVotes }}</p>
            <p>Against {{ item.againstVotes }}</p>
            <p>Abstain {{ item.abstainVotes }}</p>
        </template>
        <template v-slot:item.actions="{ item }">
            <template v-if="item.statusText === 'Active'">
                <v-btn color="green" style="color: white" rounded @click="voteAction(item.id, FOR_VOTES)">
                    <v-icon>mdi-account-multiple-check</v-icon>
                </v-btn>
                <v-btn color="red" style="color: white" rounded @click="voteAction(item.id, AGAINST_VOTES)">
                    <v-icon>mdi-account-multiple-minus</v-icon>
                </v-btn>
                <v-btn color="grey" style="color: white" rounded @click="voteAction(item.id, ABSTAIN_VOTES)">
                    <v-icon>mdi-account-lock</v-icon>
                </v-btn>
            </template>

            <template v-if="item.statusText === 'Succeeded'">
                <v-btn color="green" style="color: white" rounded @click="sendToQueue(item.id)">
                    <v-icon>mdi-av-timer</v-icon>
                    Queue
                </v-btn>
            </template>

            <template v-if="item.statusText === 'Queued'">
                <v-btn color="green" style="color: white" rounded @click="sendToExecute(item.id)">
                    <v-icon>mdi-alert-circle-check-outline</v-icon>
                    Execute
                </v-btn>
            </template>

            <template v-if="item.statusText === 'Defeated'">
                <v-btn color="grey" style="color: white" rounded @click="sendToCancel(item.id)">
                    <v-icon>mdi-cancel</v-icon>
                    Cancel
                </v-btn>
            </template>
        </template>
    </v-data-table>
</template>

<script>
import {mapActions, mapGetters} from "vuex";

export default {
    name: "ProposalList",

    data: () => ({

        AGAINST_VOTES: 0,
        FOR_VOTES: 1,
        ABSTAIN_VOTES: 2,

        headers: [
            {text: 'ID', value: 'id',},
            {text: 'Start Block', value: 'startBlock'},
            {text: 'End Block', value: 'endBlock'},
            {text: 'Votes', value: 'votes'},
            {text: 'Status', value: 'statusText'},
            {text: 'Actions', value: 'actions'},


        ]
    }),

    computed: {

        ...mapGetters('governance', ['proposals'])
    },

    methods: {

        ...mapActions('governance', ['vote', 'queue', 'execute', 'cancel']),

        sendToExecute(id) {
            this.execute(id);
        },

        sendToCancel(id) {
            this.cancel(id);
        },

        sendToQueue(id) {
            this.queue(id);
        },

        voteAction(id, status) {
            this.vote({id: id, status: status});
        }

    }
}
</script>

<style scoped>

</style>
