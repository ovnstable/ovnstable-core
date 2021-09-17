let accounting = require("accounting-js")
let moment = require("moment");

let accountingConfig = {
    symbol: "",
    precision: 6,
    thousand: " ",
}

let accountingSecondConfig = {
    symbol: "",
    precision: 2,
    thousand: " ",
}


let accountingZeroConfig = {
    symbol: "",
    precision: 2,
    thousand: " ",
}

export default {


    formatMoney(number = 0, count = 6) {

        if (!number)
            return 0;

        switch (count){
            case 6:
                return accounting.formatMoney(number, accountingConfig);
            case 2:
                return accounting.formatMoney(number, accountingSecondConfig);
            case 0:
                return accounting.formatMoney(number, accountingZeroConfig);

        }

    },

    formatDate(date, pattern){
        return moment(date, pattern, true)
    },


    getContractNameByAddress(address){

        switch (address){
            case "0x2791bca1f2de4661ed88a30c99a7a9449aa84174":
                return "USDC";
            case "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063":
                return "DAI";
            case "0x0FDa923c3f24642C10af8e794973343fAAdbabc6":
                return "OVN";
        }
    }

}
