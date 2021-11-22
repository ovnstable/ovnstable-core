const Exchange = artifacts.require("Exchange");
const USDC = artifacts.require("USDCtest")
const PortfolioManager = artifacts.require("PortfolioManager")
const Vault = artifacts.require("Vault")
const InvestmentPortfolio = artifacts.require("registries/InvestmentPortfolio")
const BuyonSwap = artifacts.require("tests/BuyonSwap.sol")

module.exports = async function (callback) {

    const pm = await PortfolioManager.deployed();
    let exchange = await Exchange.deployed();
    let vault = await Vault.deployed();
    let investmentPortfolio = await InvestmentPortfolio.deployed();


    let usdcWeight = {
        asset: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        minWeight: 25000,
        targetWeight: 50000,
        maxWeight: 60000,
    }
    let aUsdcWeight = {
        asset: "0x1a13F4Ca1d028320A707D99520AbFefca3998b7F",
        minWeight: 25000,
        targetWeight: 50000,
        maxWeight: 60000,
    }
    let weights = [
        usdcWeight,
        aUsdcWeight
    ]
    let result = await investmentPortfolio.setWeights(weights);
    console.log("set weights: 50/50");


    // let allAssetWeights2 = await investmentPortfolio.getAllAssetWeights();
    // console.log("aaa2: " + JSON.stringify(allAssetWeights2));


    const contract = new web3.eth.Contract(exchange.abi, exchange.address)
    let usdc = await USDC.at("0x2791bca1f2de4661ed88a30c99a7a9449aa84174");
    let ausdc = await USDC.at("0x1a13F4Ca1d028320A707D99520AbFefca3998b7F");


    // await usdc.approve(exchange.address, 100);
    // await usdc.approve(pm.address, 100);

    // console.log("aaa");


    // await pm.invest(usdc.address, 30);
    await usdc.approve(exchange.address, 30);
    console.log("approve 30");
    await exchange.invest(usdc.address, 30);
    console.log("invest 30");


    // let newVar = await contract.methods.buy(usdc.address, 30);
    // console.log('EVENTS')
    // console.log(newVar)

    // var usdcBalance = await usdc.balanceOf(pm.address)
    // console.log("usdc.address: " + usdc.address);
    // console.log("usdcBalance: " + usdcBalance);
     
    // var ausdcBalance = await ausdc.balanceOf(pm.address)
    // console.log("ausdc.address: " + ausdc.address);
    // console.log("ausdcBalance: " + ausdcBalance);

    var usdcBalance = await usdc.balanceOf(vault.address)
    console.log("usdc.address: " + usdc.address);
    console.log("usdcBalance: " + usdcBalance);
     
    var ausdcBalance = await ausdc.balanceOf(vault.address)
    console.log("ausdc.address: " + ausdc.address);
    console.log("ausdcBalance: " + ausdcBalance);
   
    await usdc.approve(exchange.address, 30);
    console.log("approve 30");
    await exchange.invest(usdc.address, 30);
    console.log("invest 30");


    usdcBalance = await usdc.balanceOf(vault.address)
    console.log("usdc.address: " + usdc.address);
    console.log("usdcBalance: " + usdcBalance);
     
    ausdcBalance = await ausdc.balanceOf(vault.address)
    console.log("ausdc.address: " + ausdc.address);
    console.log("ausdcBalance: " + ausdcBalance);
    

    usdcWeight = {
        asset: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        minWeight: 25000,
        targetWeight: 100000,
        maxWeight: 100000,
    }
    aUsdcWeight = {
        asset: "0x1a13F4Ca1d028320A707D99520AbFefca3998b7F",
        minWeight: 0,
        targetWeight: 0,
        maxWeight: 60000,
    }
    weights = [
        usdcWeight,
        aUsdcWeight
    ]
    result = await investmentPortfolio.setWeights(weights);
    console.log("set weights: 100/0");


    await usdc.approve(exchange.address, 30);
    console.log("approve 30");
    await exchange.invest(usdc.address, 30);
    console.log("invest 30");

    usdcBalance = await usdc.balanceOf(vault.address)
    console.log("usdc.address: " + usdc.address);
    console.log("usdcBalance: " + usdcBalance);
     
    ausdcBalance = await ausdc.balanceOf(vault.address)
    console.log("ausdc.address: " + ausdc.address);
    console.log("ausdcBalance: " + ausdcBalance);
   

    callback();
}
