<template>
        <v-app>
            <NavMenu/>

            <v-app-bar app>
                <!-- -->
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

export default {
    name: "Governance",
    components: {NavMenu}
}
</script>

<style scoped>

</style>
