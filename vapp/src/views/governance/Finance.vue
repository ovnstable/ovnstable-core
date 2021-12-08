<template>
    <v-container>
        <v-row justify="center">
            <h1>Finance</h1>
        </v-row>
        <ChangeWeightPanel/>
    </v-container>
</template>

<script>
import ChangeWeightPanel from "../../components/governance/ChangeWeightPanel";
export default {
    name: "Finance",
    components: {ChangeWeightPanel}
}
</script>

<style scoped>

</style>
