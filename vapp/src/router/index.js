import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)


const routes = [

    {
        path: '/',
        name: 'SwapView',
        component: () => import('../views/SwapView.vue'),

    },

    {
        path: '/dashboard',
        name: 'DashboardView',
        component: () => import('../views/DashboardView.vue'),

    },




]

const router = new VueRouter({
    mode: 'history',
    base: process.env.BASE_URL,
    routes
});


export default router;
