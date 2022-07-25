const BigNumber = require('bignumber.js');

module.exports = {

    toE18: (value) => {
        return new BigNumber(value).times(new BigNumber(10).pow(18)).toFixed(0)
    },
    fromE18: (value) => {
        return new BigNumber(value).div(new BigNumber(10).pow(18)).toFixed(4)
    },

    toE6: (value) => value * 10 ** 6,
    fromE6: (value) => value / 10 ** 6,


    toAsset: (value) =>{

        if (process.env.ETH_NETWORK === 'BSC'){
            return this.toE18(value);
        }else {
            return this.toE6(value);
        }
    },

    fromAsset: (value) =>{

        if (process.env.ETH_NETWORK === 'BSC'){
            return this.fromE18(value);
        }else {
            return this.fromE18(value);
        }
    }
}
