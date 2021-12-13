<template>

        <v-navigation-drawer app>
            <v-list-item>
                <v-list-item-content>
                    <v-list-item-title class="text-h6">
                        Governance
                    </v-list-item-title>
                    <v-list-item-subtitle>
                        OVN
                    </v-list-item-subtitle>
                </v-list-item-content>
            </v-list-item>

            <v-divider></v-divider>

            <v-list
                dense
                nav
            >
                <v-list-item
                    v-for="item in items"
                    :key="item.title"
                    link
                    :to="{name: item.title}"
                >
                    <v-list-item-icon>
                        <v-icon>{{ item.icon }}</v-icon>
                    </v-list-item-icon>

                    <v-list-item-content>
                        <v-list-item-title>{{ item.title }}</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
            </v-list>
        </v-navigation-drawer>
</template>

<script>
export default {
    name: "NavMenu",

    data:()=>({
        items: [
            { title: 'Overview', icon: 'mdi-view-dashboard' },
            { title: 'Proposals', icon: 'mdi-folder-table-outline' },
            { title: 'Finance', icon: 'mdi-chart-bar' },
            { title: 'Control', icon: 'mdi-clipboard-edit' },
        ],
    }),
}
</script>

<style scoped>

</style>
