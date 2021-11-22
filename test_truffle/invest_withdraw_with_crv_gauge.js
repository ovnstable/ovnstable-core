const Exchange = artifacts.require("Exchange");
const USDC = artifacts.require("USDCtest")
const PortfolioManager = artifacts.require("PortfolioManager")
const Vault = artifacts.require("Vault")
const InvestmentPortfolio = artifacts.require("registries/InvestmentPortfolio")
const BuyonSwap = artifacts.require("tests/BuyonSwap.sol")
const OvernightToken = artifacts.require("OvernightToken")
const Balancer = artifacts.require("Balancer")


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
    try{
    let accounts = await web3.eth.getAccounts()
    let userAccount = accounts[0];

    console.log("userAccount: " + userAccount);
    ovn = await OvernightToken.deployed();
    const pm = await PortfolioManager.deployed();
    let exchange = await Exchange.deployed();
    let vault = await Vault.deployed();
    let investmentPortfolio = await InvestmentPortfolio.deployed();
    let balancer = await Balancer.deployed();


    usdc = await USDC.at("0x2791bca1f2de4661ed88a30c99a7a9449aa84174");
    ausdc = await USDC.at("0x1a13F4Ca1d028320A707D99520AbFefca3998b7F");
    a3Crv = await USDC.at("0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171");
    a3CrvGauge = await USDC.at("0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c");
    crv = await USDC.at("0x172370d5Cd63279eFa6d502DAB29171933a610AF");
    wMatic = await USDC.at("0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270");


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
    let usdcWeight = {
        asset: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        minWeight: 0,
        targetWeight: 10000,
        maxWeight: 100000,
    }
    let aUsdcWeight = {
        asset: "0x1a13F4Ca1d028320A707D99520AbFefca3998b7F",
        minWeight: 0,
        targetWeight: 10000,
        maxWeight: 100000,
    }
    let a3CrvWeight = {
        asset: "0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171",
        minWeight: 0,
        targetWeight: 40000,
        maxWeight: 100000,
    }
    let a3CrvGaugeWeight = {
        asset: "0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c",
        minWeight: 0,
        targetWeight: 40000,
        maxWeight: 100000,
    }
    let wMaticWeight = {
        asset: wMatic.address,
        minWeight: 0,
        targetWeight: 0,
        maxWeight: 100000,
    }
    let crvWeight = {
        asset: crv.address,
        minWeight: 0,
        targetWeight: 0,
        maxWeight: 100000,
    }
    let weights = [
        usdcWeight,
        aUsdcWeight,
        a3CrvWeight,
        a3CrvGaugeWeight,
        wMaticWeight,
        crvWeight
    ]
    let result = await investmentPortfolio.setWeights(weights);
    console.log("set weights: 10/10/40/40/0/0");


    await printBalances("user", userAccount);
    await printBalances("vault", vault.address);

    var userInversAmount = 1000 * 1000000;

    await usdc.approve(exchange.address, userInversAmount);
    console.log("user approve " + userInversAmount);
    callResult = await exchange.buy(usdc.address, userInversAmount);
    console.log("user buy " + userInversAmount);
    // logEvents(callResult);

    
    await printBalances("user", userAccount);
    await printBalances("vault", vault.address);
  
    // await usdc.approve(exchange.address, userInversAmount);
    // console.log("user approve " + userInversAmount);
    // callResult = await exchange.buy(usdc.address, userInversAmount);
    // console.log("user buy " + userInversAmount);
    // console.log("user buy " + JSON.stringify(callResult, null, 2));

    
    // await printBalances("user", userAccount);
    // await printBalances("vault", vault.address);



    var ovnBalance = await ovn.balanceOf(userAccount);
    var withdrawAmount = parseInt(ovnBalance * 0.2, 10);
    console.log("userAccount redeem: " + withdrawAmount + " of " + ovnBalance);
    callResult = await exchange.redeem(usdc.address, withdrawAmount);

    console.log("user redeem " + withdrawAmount + " of " + ovnBalance);
    // logEvents(callResult);

     
    await printBalances("user", userAccount);
    await printBalances("vault", vault.address);
  
    // rewards
    console.log("before reward");
    callResult = await exchange.reward();
    console.log("after reward");
    // logEvents(callResult);

    await printBalances("user", userAccount);
    await printBalances("vault", vault.address);


    ovnBalance = await ovn.balanceOf(userAccount);
    withdrawAmount = parseInt(ovnBalance * 0.90, 10);
    console.log("userAccount redeem: " + withdrawAmount + " of " + ovnBalance);
    callResult = await exchange.redeem(usdc.address, withdrawAmount);
    // logEvents(callResult);

     
    await printBalances("user", userAccount);
    await printBalances("vault", vault.address);

    ovnBalance = await ovn.balanceOf(userAccount);
    withdrawAmount = parseInt(ovnBalance * 0.90, 10);
    console.log("userAccount redeem: " + withdrawAmount + " of " + ovnBalance);
    callResult = await exchange.redeem(usdc.address, withdrawAmount);
    // logEvents(callResult);

     
    await printBalances("user", userAccount);
    await printBalances("vault", vault.address);
  
    // callback();

    }catch(error){
        console.log(error);
        
    }
    callback();
}
