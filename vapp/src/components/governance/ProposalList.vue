<template>

    <v-container>
        <v-row >
            <v-card v-for="item in proposals">
                <v-card-title>
                    ID: {{ item.id }}
                </v-card-title>
                <v-card-text>
                    <v-row dense>
                        <v-col>
                            <v-text-field readonly v-model="item.startBlock" label="Start block" outlined dense>
                            </v-text-field>
                        </v-col>
                        <v-col>
                            <v-text-field readonly v-model="item.endBlock" label="End block" outlined dense>
                            </v-text-field>
                        </v-col>
                    </v-row>

                    <v-row dense>
                        <v-col lg="4">
                            <v-text-field readonly v-model="item.forVotes" label="For Votes" outlined dense>
                            </v-text-field>
                        </v-col>
                    </v-row>

                    <v-row dense>
                        <v-col lg="4">
                                <v-text-field readonly v-model="item.againstVotes" label="Against Votes" outlined dense>
                                </v-text-field>
                        </v-col>
                    </v-row>

                    <v-row dense>
                        <v-col lg="4">
                                <v-text-field readonly v-model="item.abstainVotes" label="Abstain Votes" outlined dense>
                                </v-text-field>
                        </v-col>
                    </v-row>

                    <v-row dense>
                        <v-col>
                            <v-text-field readonly v-model="item.statusText" label="Status text" outlined dense>
                            </v-text-field>
                        </v-col>
                        <v-col>
                            <v-text-field readonly v-model="item.status" label="Status" outlined dense>
                            </v-text-field>
                        </v-col>
                    </v-row>
                </v-card-text>
                <v-card-actions>
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
                            <v-icon>mdi-av-timer</v-icon>Queue
                        </v-btn>
                    </template>

                    <template v-if="item.statusText === 'Queued'">
                        <v-btn color="green" style="color: white" rounded @click="sendToExecute(item.id)">
                            <v-icon>mdi-alert-circle-check-outline</v-icon>Execute
                        </v-btn>
                    </template>

                    <template v-if="item.statusText === 'Defeated'">
                        <v-btn color="grey" style="color: white" rounded @click="sendToCancel(item.id)">
                            <v-icon>mdi-cancel</v-icon>Cancel
                        </v-btn>
                    </template>

                </v-card-actions>
            </v-card>
        </v-row>
    </v-container>
</template>

<script>
import {mapActions, mapGetters} from "vuex";

export default {
    name: "ProposalList",

    data: () => ({

        AGAINST_VOTES: 0,
        FOR_VOTES: 1,
        ABSTAIN_VOTES: 2,
    }),

    computed: {

        ...mapGetters('governance', ['proposals'])
    },

    methods: {

        ...mapActions('governance', ['vote', 'queue', 'execute', 'cancel']),

        sendToExecute(id){
            this.execute(id);
        },

        sendToCancel(id){
            this.cancel(id);
        },

        sendToQueue(id){
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
