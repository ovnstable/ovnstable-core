const Exchange = artifacts.require("Exchange");
const USDC = artifacts.require("USDCtest")
const PortfolioManager = artifacts.require("PortfolioManager")
const Vault = artifacts.require("Vault")
const InvestmentPortfolio = artifacts.require("registries/InvestmentPortfolio")
const BuyonSwap = artifacts.require("tests/BuyonSwap.sol")
const OvernightToken = artifacts.require("OvernightToken")
const Mark2Market = artifacts.require("Mark2Market")
const IRewardOnlyGauge = artifacts.require("connectors/curve/interfaces/IRewardOnlyGauge")

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

module.exports = async function (callback) {
    try {
        let accounts = await web3.eth.getAccounts()
        let userAccount = accounts[0];

        console.log("userAccount: " + userAccount);
        const m2m = await Mark2Market.deployed();
        const vault = await Vault.deployed();

        let curveGaugeAddress = "0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c"
        const gauge = await IRewardOnlyGauge.at(curveGaugeAddress);

        // callResult = await m2m.assetPrices();
        // console.log("--- Logs: ")
        // for (let rawLog of callResult.receipt.rawLogs) {
        //     let data = rawLog.data;
        //     data = data.replace("0x", "");
        //     // data = data.replace("00", "");
        //     console.log(hex2a(data));
        // }
        // console.log("--- Logs end")

        // // const fsPromises = require('fs').promises
        // // await fsPromises.writeFile('test.txt', JSON.stringify(callResult, null, 2));

        // totalPrices = await m2m.assetPrices.call();
        // console.log("--- totalPrices: ")
        // for (let balanceAction of totalPrices) {
        //     console.log(balanceAction)
        // }
        // console.log("--- totalPrices end")
        // // await fsPromises.writeFile('test2.txt', JSON.stringify(callResult, null, 2));


        // crv = await USDC.at("0x172370d5Cd63279eFa6d502DAB29171933a610AF");
        // wMatic = await USDC.at("0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270");
    
        console.log("CRV:")
        res = await gauge.claimed_reward.call(
            vault.address,
            "0x172370d5Cd63279eFa6d502DAB29171933a610AF"
        )
        console.log("claimed_reward: " + res)
        res = await gauge.claimable_reward_write.call(
            vault.address,
            "0x172370d5Cd63279eFa6d502DAB29171933a610AF"
        )
        console.log("claimable_reward: " + res)
   
        console.log("wMatic:")
        res = await gauge.claimed_reward.call(
            vault.address,
            "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"
        )
        console.log("claimed_reward: " + res)
        res = await gauge.claimable_reward_write.call(
            vault.address,
            "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"
        )
        console.log("claimable_reward: " + res)


        // await gauge.claim_rewards(vault.address);


        // callResult = await m2m.assetPrices();
        // console.log("--- Logs: ")
        // for (let rawLog of callResult.receipt.rawLogs) {
        //     let data = rawLog.data;
        //     data = data.replace("0x", "");
        //     // data = data.replace("00", "");
        //     console.log(hex2a(data));
        // }
        // console.log("--- Logs end")

        // // const fsPromises = require('fs').promises
        // // await fsPromises.writeFile('test.txt', JSON.stringify(callResult, null, 2));

        // totalPrices = await m2m.assetPrices.call();
        // console.log("--- totalPrices: ")
        // for (let balanceAction of totalPrices) {
        //     console.log(balanceAction)
        // }
        // console.log("--- totalPrices end")
        // // await fsPromises.writeFile('test2.txt', JSON.stringify(callResult, null, 2));

 

    } catch (error) {
        console.log(error);

    }
    callback();
}
