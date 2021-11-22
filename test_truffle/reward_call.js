const Exchange = artifacts.require("Exchange");
const USDC = artifacts.require("USDCtest")
const Vault = artifacts.require("Vault")
const OvernightToken = artifacts.require("OvernightToken")


let ovn
let usdc
let ausdc
let a3Crv
let a3CrvGauge
let crv
let wMatic


function hex2a(hexx) {
    var hex = hexx.toString();//force conversion
    var str = '';
    for (var i = 0; i < hex.length; i += 2) {
        code = parseInt(hex.substr(i, 2), 16);
        if (code == 0x20
            || (0x30 <= code && code <= 0x7A)
        )
            str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return str;
}

function logEvents(callResult) {
    console.log("---  EVENTS:")
    for (let rawLog of callResult.receipt.rawLogs) {
        let data = rawLog.data;
        data = data.replace("0x", "");
        console.log(hex2a(data));
    }
    console.log("---  EVENTS end")
}

async function printBalances(name, address) {
    console.log("---  " + name + ":");
    console.log("- " + usdc.address + " | usdcBalance: " + await usdc.balanceOf(address));
    console.log("- " + ausdc.address + " | ausdcBalance: " + await ausdc.balanceOf(address));
    console.log("- " + a3Crv.address + " | a3CrvBalance: " + await a3Crv.balanceOf(address));
    console.log("- " + a3CrvGauge.address + " | a3CrvGaugeBalance: " + await a3CrvGauge.balanceOf(address));
    console.log("- " + crv.address + " | crvBalance: " + await crv.balanceOf(address));
    console.log("- " + wMatic.address + " | wMaticBalance: " + await wMatic.balanceOf(address));
    console.log("- " + ovn.address + " | ovnBalance: " + await ovn.balanceOf(address));
    console.log("---------------------");
}


module.exports = async function (callback) {
    try {
        let accounts = await web3.eth.getAccounts()
        let userAccount = accounts[0];

        console.log("userAccount: " + userAccount);
        ovn = await OvernightToken.deployed();
        let exchange = await Exchange.deployed();
        let vault = await Vault.deployed();


        usdc = await USDC.at("0x2791bca1f2de4661ed88a30c99a7a9449aa84174");
        ausdc = await USDC.at("0x1a13F4Ca1d028320A707D99520AbFefca3998b7F");
        a3Crv = await USDC.at("0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171");
        a3CrvGauge = await USDC.at("0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c");
        crv = await USDC.at("0x172370d5Cd63279eFa6d502DAB29171933a610AF");
        wMatic = await USDC.at("0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270");


        await printBalances("user", userAccount);
        await printBalances("vault", vault.address);

        // rewards
        console.log("before reward");
        callResult = await exchange.reward();
        console.log("after reward");
        logEvents(callResult);

        await printBalances("user", userAccount);
        await printBalances("vault", vault.address);

        // callback();

    } catch (error) {
        console.log(error);

    }
    callback();
}
