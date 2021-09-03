let accounting = require("accounting-js")


let accountingConfig = {
    symbol: "",
    precision: 6,
    thousand: " ",
}


export default {

    formatMoney(number = 0) {

        if (!number)
            return 0;

        return accounting.formatMoney(number, accountingConfig);
    },


}
