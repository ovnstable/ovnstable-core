<template>
        <v-app>
            <NavMenu/>

            <v-app-bar app>
                <v-btn icon @click="updateBlockNumber"><v-icon>mdi-refresh</v-icon></v-btn>
                Current block: {{currentBlock}}

                <v-btn icon @click="mineBlock"><v-icon>mdi-data-matrix-plus</v-icon></v-btn>

            </v-app-bar>

            <!-- Sizes your content based upon application components -->
            <v-main>

                <!-- Provides the application the proper gutter -->
                <v-container fluid>

                    <!-- If using vue-router -->
                    <router-view></router-view>
                </v-container>
            </v-main>

            <v-footer app>
                <!-- -->
            </v-footer>
        </v-app>
</template>

<script>
import NavMenu from "./components/governance/NavMenu";
import {mapActions, mapGetters} from "vuex";

export default {
    name: "Governance",
    components: {NavMenu},

    data:()=>({
        currentBlock: null,
    }),

    computed:{

        ...mapGetters('web3', ['web3']),

    },

    methods:{

        ...mapActions('ethers', ['mineBlocks']),

        async mineBlock(){
            await this.mineBlocks(5);
            await this.updateBlockNumber();
        },

        async updateBlockNumber() {
            this.currentBlock = await this.web3.eth.getBlockNumber();
        },
    }
}
</script>

<style scoped>

</style>
