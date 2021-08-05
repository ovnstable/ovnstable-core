import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)


const routes = [

    {
        path: '/',
        name: 'SaveView',
        component: () => import('../views/SaveView.vue'),

    },

    {
        path: '/exchange/swap',
        name: 'SwapView',
        component: () => import('../views/SwapView.vue'),

    },

    {
        path: '/stats',
        name: 'StatsView',
        component: () => import('../views/StatsView.vue'),

    },

    {
        path: '/account',
        name: 'AccountView',
        component: () => import('../views/AccountView.vue'),

    },

    {
        path: '/example',
        name: 'HelloWorld',
        component: () => import('../example/HelloWorld'),

    },




]

const router = new VueRouter({
    mode: 'history',
    base: process.env.BASE_URL,
    routes
});


export default router;
