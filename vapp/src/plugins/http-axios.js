'use strict'
import Axios from 'axios';
let axios = Axios.create({
    baseURL: (process.env.VUE_APP_HOST ? process.env.VUE_APP_HOST : '') + process.env.VUE_APP_API,
});

export {axios};
