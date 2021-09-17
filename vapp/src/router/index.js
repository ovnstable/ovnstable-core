import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)


const routes = [

    {
        path: '/',
        name: 'Dapp',
        component: () => import('../Dapp.vue'),

        children: [

            {
                path: '/',
                name: 'EarnView',
                component: () => import('../views/EarnView.vue'),

            },
            {
                path: '/fund',
                name: 'DashboardView',
                component: () => import('../views/DashboardView.vue'),

            },

            {
                path: '/stats',
                name: 'StatsView',
                component: () => import('../views/StatsView.vue'),

            },
        ]
    },

    {
        path: '/admin',
        name: 'Admin',
        component: () => import('../Admin.vue'),
        children: [
            {
                path: '/admin',
                name: 'AdminView',
                component: () => import('../views/AdminView.vue'),

            },
        ]
    },


]

const router = new VueRouter({
    mode: 'history',
    base: process.env.BASE_URL,
    routes
});


export default router;
