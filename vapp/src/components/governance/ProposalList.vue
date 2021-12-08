<template>

    <v-container>
        <v-row v-for="item in proposals">
        <v-card>
            <v-card-title>
                {{item}}
            </v-card-title>
            <v-card-actions></v-card-actions>
        </v-card>
        </v-row>
    </v-container>
</template>

<script>
import {mapGetters} from "vuex";

export default {
    name: "ProposalList",

    data:()=>({

    }),

    computed:{

        ...mapGetters('governance', ['proposals'])
    },

    methods:{

    }
}
</script>

<style scoped>

</style>
