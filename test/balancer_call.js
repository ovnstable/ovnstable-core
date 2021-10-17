const Exchange = artifacts.require("Exchange");
const USDC = artifacts.require("USDCtest")
const PortfolioManager = artifacts.require("PortfolioManager")
const Vault = artifacts.require("Vault")
const InvestmentPortfolio = artifacts.require("registries/InvestmentPortfolio")
const BuyonSwap = artifacts.require("tests/BuyonSwap.sol")
const OvernightToken = artifacts.require("OvernightToken")
const Balancer = artifacts.require("Balancer")
const IERC20 = artifacts.require("@openzeppelin/contracts/token/ERC20/IERC20.sol")

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
        // const pm = await PortfolioManager.deployed();
        // let exchange = await Exchange.deployed();
        let vault = await Vault.deployed();
        // let investmentPortfolio = await InvestmentPortfolio.deployed();
        let balancer = await Balancer.deployed();


        usdc = await IERC20.at("0x2791bca1f2de4661ed88a30c99a7a9449aa84174");
        ausdc = await IERC20.at("0x1a13F4Ca1d028320A707D99520AbFefca3998b7F");
        a3Crv = await IERC20.at("0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171");
        a3CrvGauge = await IERC20.at("0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c");
        crv = await IERC20.at("0x172370d5Cd63279eFa6d502DAB29171933a610AF");
        wMatic = await IERC20.at("0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270");

        // let usdcWeight = {
        //     asset: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        //     minWeight: 25000,
        //     targetWeight: 40000,
        //     maxWeight: 60000,
        // }
        // let aUsdcWeight = {
        //     asset: "0x1a13F4Ca1d028320A707D99520AbFefca3998b7F",
        //     minWeight: 25000,
        //     targetWeight: 40000,
        //     maxWeight: 60000,
        // }
        //  let a3CrvWeight = {
        //     asset: "0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171",
        //     minWeight: 0,
        //     targetWeight: 20000,
        //     maxWeight: 40000,
        // }
        // let weights = [
        //     usdcWeight,
        //     aUsdcWeight,
        //     a3CrvWeight
        // ]
        // let result = await investmentPortfolio.setWeights(weights);
        // console.log("set weights: 40/40/20");


        // console.log("userAccount usdcBalance: " +  await usdc.balanceOf(userAccount));
        // console.log("userAccount ausdcBalance: " + await ausdc.balanceOf(userAccount));
        // console.log("userAccount a3CrvBalance: " + await a3Crv.balanceOf(userAccount));
        // console.log("userAccount ovnBalance: " + await ovn.balanceOf(userAccount));

        // console.log("vault usdcBalance: " +  await usdc.balanceOf(vault.address));
        // console.log("vault ausdcBalance: " + await ausdc.balanceOf(vault.address));
        // console.log("vault a3CrvBalance: " + await a3Crv.balanceOf(vault.address));

        // var userInversAmount = 100000 * 1000000;

        // await usdc.approve(exchange.address, userInversAmount);
        // console.log("user approve " + userInversAmount);
        // callResult = await exchange.buy(usdc.address, userInversAmount);
        // console.log("user buy " + userInversAmount);
        // // console.log("user buy " + JSON.stringify(callResult, null, 2));
        // for(let rawLog of callResult.receipt.rawLogs) {
        //     let data = rawLog.data;
        //     data = data.replace("0x", "");
        //     // data = data.replace("00", "");
        //     console.log(hex2a(data));
        // }



        
        // await usdc.transfer(vault.address, 100*1000000);


        await printBalances("user", userAccount);
        await printBalances("vault", vault.address);


        // let withdrawAmount = 2 * 10**6;
        // let withdrawAmount = 0 * 10**6;
        let withdrawAmount = 2000000;
        callResult = await balancer.buildBalanceActions(
            usdc.address,
            withdrawAmount
        )
        console.log("--- Logs: ")
        for (let rawLog of callResult.receipt.rawLogs) {
            let data = rawLog.data;
            data = data.replace("0x", "");
            // data = data.replace("00", "");
            console.log(hex2a(data));
        }
        console.log("--- Logs end")

        // const fsPromises = require('fs').promises
        // await fsPromises.writeFile('test.txt', JSON.stringify(callResult, null, 2));

        balanceActions = await balancer.buildBalanceActions.call(
            usdc.address,
            withdrawAmount
        );
        console.log("--- BalanceActions: ")
        for (let balanceAction of balanceActions) {
            console.log(balanceAction[4] +
                " from " + balanceAction[2] +
                " to " + balanceAction[3] +
                " with token exchange " + balanceAction[0]
            )
        }
        console.log("--- Logs end")


        // await fsPromises.writeFile('test2.txt', JSON.stringify(callResult, null, 2));


    } catch (error) {
        console.log(error);

    }
    callback();
}
