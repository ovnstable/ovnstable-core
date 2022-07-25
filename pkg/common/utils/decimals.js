const BigNumber = require('bignumber.js');
const {toE18, toE6, fromE18} = require("./decimals");

module.exports = {

    toE18: (value) => {
        return new BigNumber(value).times(new BigNumber(10).pow(18)).toFixed(4)
    },
    fromE18: (value) => {
        return new BigNumber(value).div(new BigNumber(10).pow(18)).toFixed(4)
    },

    toE6: (value) => value * 10 ** 6,
    fromE6: (value) => value / 10 ** 6,


    toAsset: (value) =>{

        if (process.env.ETH_NETWORK === 'BSC'){
            return toE18(value);
        }else {
            return toE6(value);
        }
    },

    fromAsset: (value) =>{

        if (process.env.ETH_NETWORK === 'BSC'){
            return fromE18(value);
        }else {
            return fromE18(value);
        }
    }
}
