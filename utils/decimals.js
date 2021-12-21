

module.exports = {

    toE18: (value) => value * 10 ** 18,
    fromE18: (value) => value / 10 ** 18,

    toE6: (value) => value * 10 ** 6,
    fromE6: (value) => value / 10 ** 6,

    toUSDC: (value) => value * 10 ** 6,
    fromUSDC: (value) => value / 10 ** 6,

    toOvn: (value) => value * 10 ** 6,
    fromOvn: (value) => value / 10 ** 6,

    toAmUSDC: (value) => value * 10 ** 6,
    fromAmUSDC: (value) => value / 10 ** 6,

    toWmatic: (value) => value * 10 ** 18,
    fromWmatic: (value) => value / 10 ** 18,

    toCRV: (value) => value * 10 ** 18,
    fromCRV: (value) => value / 10 ** 18,

    toAm3CRV: (value) => value * 10 ** 18,
    froAm3CRV: (value) => value / 10 ** 18,

    toIdle: (value) => value * 10 ** 18,
    fromIdle: (value) => value / 10 ** 18,

    toOvnGov: (value) => value * 10 ** 18,
    fromOvnGov: (value) => value / 10 ** 18,

    //TODO balancer
    toBpsp: (value) => value * 10 ** 18,
    fromBpsp: (value) => value / 10 ** 18,

    toTUsd: (value) => value * 10 ** 18,
    fromTUsd: (value) => value / 10 ** 18,

    toBal: (value) => value * 10 ** 18,
    fromBal: (value) => value / 10 ** 18
}
