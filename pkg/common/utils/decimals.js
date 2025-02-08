const BigNumber = require('bignumber.js');


function toE18(value) {
    return new BigNumber(value.toString()).times(new BigNumber(10).pow(18)).toFixed(0);
}

/**
 * Convert from e18 decimals to simple number.
 * @param value BigNumber or String or Number
 * @returns {number} Must be NUMBER not STRING
 */
function fromE18(value) {
    return Number.parseFloat(new BigNumber(value.toString()).div(new BigNumber(10).pow(18)).toFixed(3).toString());
}

function toE6(value) {
    return new BigNumber(value.toString()).times(new BigNumber(10).pow(6)).toFixed(0);
}

function fromE6(value) {
    return value / 10 ** 6;
}

function toE8(value) {
    return value * 10 ** 8;
}

function fromE8(value) {
    return value / 10 ** 8;
}

function toAsset(value, stand = process.env.STAND) {
    if (stand === 'bsc' ||
        stand === 'bsc_usdt' ||
        stand === 'optimism_dai' ||
        stand === 'arbitrum_eth' ||
        stand === "base_dai" ||
        stand === "base_ovn" ||
        stand === "arbitrum_dai" ||
        stand === "blast" ||
        stand === "blast_usdc") {
        return toE18(value);
    } else {
        return toE6(value);
    }
}


function fromUsdPlus(value, stand = process.env.STAND){

    let fromUsdPlus;
    if (stand === "bsc"){
        fromUsdPlus = fromE6(value, stand);
    }else {
        fromUsdPlus = fromAsset(value, stand);
    }

    return fromUsdPlus;

}

function fromAsset(value, stand = process.env.STAND) {
    if (stand === 'bsc' ||
        stand === 'bsc_usdt' ||
        stand === 'optimism_dai' ||
        stand === 'arbitrum_eth' ||
        stand === 'base_dai' ||
        stand === "base_ovn" ||
        stand === 'arbitrum_dai' ||
        stand === 'blast' ||
        stand === 'blast_usdc') {
        return fromE18(value);
    } else {
        return fromE6(value);
    }
}

module.exports = {

    toE18: toE18,
    fromE18: fromE18,

    toE8: toE8,
    fromE8: fromE8,

    toE6: toE6,
    fromE6: fromE6,

    toAsset: toAsset,
    fromAsset: fromAsset,

    fromUsdPlus: fromUsdPlus
}
