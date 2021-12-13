<template>
    <v-container>
        <v-row justify="center">
            <h1>Control</h1>
        </v-row>
        <v-row>
            <v-col lg="4">
                <ExchangeControl/>
            </v-col>
            <v-col lg="4">
                <GovTokenControl/>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
import ExchangeControl from "../../components/governance/control/ExchangeControl";
import GovTokenControl from "../../components/governance/control/GovTokenControl";

export default {
    name: "Control",
    components: {GovTokenControl, ExchangeControl }
}
</script>

<style scoped>

</style>
