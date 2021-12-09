import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)


import store from "../store";


import getOverview from "./midleware/getOverview"
import getProposals from "./midleware/getProposals"
import getDapp from "./midleware/getDapp"
import middlewarePipeline from "./middlewarePipeline";

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
        ],
        meta: {
            middleware: [
                getDapp,
            ]
        }
    },


    {
        path: '/governance',
        name: 'Governance',
        component: () => import('../Governance.vue'),
        children: [
            {
                path: '/',
                name: 'Overview',
                component: () => import('../views/governance/Overview.vue'),
                meta: {
                    middleware: [
                        getOverview,
                    ]
                }
            },
            {
                path: '/governance/finance',
                name: 'Finance',
                component: () => import('../views/governance/Finance.vue'),
                meta: {
                    middleware: [
                        getOverview,
                    ]
                }
            },
            {
                path: '/governance/proposals',
                name: 'Proposals',
                component: () => import('../views/governance/Proposals.vue'),
                meta: {
                    middleware: [
                        getProposals,
                    ]
                }
            },

            {
                path: '/governance/timelock',
                name: 'Timelock',
                component: () => import('../views/governance/TimeLock.vue'),
                meta: {
                    middleware: [
                    ]
                }
            },

            {
                path: '/governance/control',
                name: 'Control',
                component: () => import('../views/governance/Control.vue'),
                meta: {
                    middleware: [
                        getOverview
                    ]
                }
            },

        ],
    },


]

const router = new VueRouter({
    mode: 'history',
    base: process.env.BASE_URL,
    routes
});

router.beforeEach((to, from, next) => {

    if (!to.meta.middleware || !to.meta.middleware.length) {
        console.log(`root from:${from.path} to:${to.path} to.middleware:`, null);
        return next();
    }
    const middleware = to.meta.middleware;
    console.log(`root from:${from.path} to:${to.path} to.middleware:`, middleware);

    const context = {
        to,
        from,
        next,
        store,
    };

    return middleware[0]({
        context,
        nextMiddleware: middlewarePipeline(context, middleware, 1)
    });

});


export default router;
