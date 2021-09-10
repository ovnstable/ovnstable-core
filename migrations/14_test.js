const router = "0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff"
const BuyonSwap = artifacts.require("tests/BuyonSwap.sol");
let USDC

const argv = require('minimist')(process.argv.slice(2), {string: ['custom_argument']});


module.exports = async function (deployer) {

    console.log('TEST:' + argv['custom_argument']);

}
