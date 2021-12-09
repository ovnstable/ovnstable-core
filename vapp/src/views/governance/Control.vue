<template>
    <v-container>
        <v-row justify="center">
            <h1>Control</h1>
        </v-row>
        <v-row>
            <v-col lg="4">
                <Exchange/>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
import Exchange from "../../components/governance/control/Exchange";

export default {
    name: "Control",
    components: {Exchange}
}
</script>

<style scoped>

</style>
