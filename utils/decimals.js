module.exports = {

    toE18: (value) => value * 10 ** 18,
    fromE18: (value) => value / 10 ** 18,

    toE6: (value) => value * 10 ** 6,
    fromE6: (value) => value / 10 ** 6,

    toUSDC: (value) => value * 10 ** 6,
    fromUSDC: (value) => value / 10 ** 6,

    toOvn: (value) => value * 10 ** 6,
    fromOvn: (value) => value / 10 ** 6,

    toOvnGov: (value) => value * 10 ** 18,
    fromOvnGov: (value) => value / 10 ** 18

}
