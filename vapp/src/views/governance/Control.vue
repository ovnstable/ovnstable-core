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
            <v-col lg="4">
                <TimelockControllerControl/>
            </v-col>
        </v-row>
        <v-row>
            <v-col lg="4">
                <GovernorControl/>
            </v-col>
            <v-col lg="4">
                <UpdateToControl/>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
import ExchangeControl from "../../components/governance/control/ExchangeControl";
import GovTokenControl from "../../components/governance/control/GovTokenControl";
import TimelockControllerControl from "../../components/governance/control/TimelockControllerControl";
import GovernorControl from "../../components/governance/control/GovernorControl";
import UpdateToControl from "../../components/governance/control/UpdateToControl";

export default {
    name: "Control",
    components: {UpdateToControl, GovernorControl, TimelockControllerControl, GovTokenControl, ExchangeControl }
}
</script>

<style scoped>

</style>
