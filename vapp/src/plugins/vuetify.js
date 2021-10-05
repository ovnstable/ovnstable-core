import Vue from 'vue';
import Vuetify from 'vuetify/lib/framework';
import 'vuetify/dist/vuetify.min.css'

import 'font-awesome/css/font-awesome.min.css' // Ensure you are using css-loader

Vue.use(Vuetify);

export default new Vuetify({
    icons: {
        iconfont: 'fa4',
    },
});
