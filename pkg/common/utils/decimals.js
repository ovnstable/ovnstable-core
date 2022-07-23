const BigNumber = require('bignumber.js');

module.exports = {

    toE18: (value) => new BigNumber(value).times(new BigNumber(10).pow(18)).toFixed(),
    fromE18: (value) => new BigNumber(value).div(new BigNumber(10).pow(18)).toFixed(),

    toE6: (value) => value * 10 ** 6,
    fromE6: (value) => value / 10 ** 6,

    toE6: (value) => value * 10 ** 6,
    fromE6: (value) => value / 10 ** 6,

}
