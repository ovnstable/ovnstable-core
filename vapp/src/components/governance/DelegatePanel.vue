<template>
<v-container class="pa-0 ma-0">
    <v-card>
        <v-card-title>Delegate</v-card-title>
        <v-card-actions>
            <v-container>
                <v-row>
                    <v-col>
                        <v-text-field v-model="address" label="Address" outlined dense>
                        </v-text-field>
                    </v-col>
                </v-row>
                <v-row>
                    <v-col>
                        <v-btn @click="delegateAction">
                            Delegate
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
    name: "DelegatePanel",

    data: () => ({
        address: null,
    }),

    methods: {

        ...mapActions('governance', ['delegate']),

        delegateAction() {
            this.delegate(this.address);
        },
    }
}
</script>

<style scoped>

</style>
