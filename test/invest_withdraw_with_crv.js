const Exchange = artifacts.require("Exchange");
const USDC = artifacts.require("USDCtest")
const PortfolioManager = artifacts.require("PortfolioManager")
const Vault = artifacts.require("Vault")
const InvestmentPortfolio = artifacts.require("registries/InvestmentPortfolio")
const BuyonSwap = artifacts.require("tests/BuyonSwap.sol")
const OvernightToken = artifacts.require("OvernightToken")
const Balancer = artifacts.require("Balancer")

function hex2a(hexx) {
    var hex = hexx.toString();//force conversion
    var str = '';
    for (var i = 0; i < hex.length; i += 2){
        code = parseInt(hex.substr(i, 2), 16);
        if(code == 0x20 
            || (0x30 <= code && code <= 0x7A)
        )
            str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return str;
}

module.exports = async function (callback) {
    try{
    let accounts = await web3.eth.getAccounts()
    let userAccount = accounts[0];

    console.log("userAccount: " + userAccount);
    const ovn = await OvernightToken.deployed();
    const pm = await PortfolioManager.deployed();
    let exchange = await Exchange.deployed();
    let vault = await Vault.deployed();
    let investmentPortfolio = await InvestmentPortfolio.deployed();
    let balancer = await Balancer.deployed();


    const contract = new web3.eth.Contract(exchange.abi, exchange.address)
    let usdc = await USDC.at("0x2791bca1f2de4661ed88a30c99a7a9449aa84174");
    let ausdc = await USDC.at("0x1a13F4Ca1d028320A707D99520AbFefca3998b7F");
    let a3Crv = await USDC.at("0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171");

    let usdcWeight = {
        asset: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        minWeight: 25000,
        targetWeight: 40000,
        maxWeight: 60000,
    }
    let aUsdcWeight = {
        asset: "0x1a13F4Ca1d028320A707D99520AbFefca3998b7F",
        minWeight: 25000,
        targetWeight: 40000,
        maxWeight: 60000,
    }
     let a3CrvWeight = {
        asset: "0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171",
        minWeight: 0,
        targetWeight: 20000,
        maxWeight: 40000,
    }
    let weights = [
        usdcWeight,
        aUsdcWeight,
        a3CrvWeight
    ]
    let result = await investmentPortfolio.setWeights(weights);
    console.log("set weights: 40/40/20");

    
    console.log("userAccount usdcBalance: " +  await usdc.balanceOf(userAccount));
    console.log("userAccount ausdcBalance: " + await ausdc.balanceOf(userAccount));
    console.log("userAccount a3CrvBalance: " + await a3Crv.balanceOf(userAccount));
    console.log("userAccount ovnBalance: " + await ovn.balanceOf(userAccount));
    
    console.log("vault usdcBalance: " +  await usdc.balanceOf(vault.address));
    console.log("vault ausdcBalance: " + await ausdc.balanceOf(vault.address));
    console.log("vault a3CrvBalance: " + await a3Crv.balanceOf(vault.address));

    var userInversAmount = 100000 * 1000000;

    await usdc.approve(exchange.address, userInversAmount);
    console.log("user approve " + userInversAmount);
    callResult = await exchange.buy(usdc.address, userInversAmount);
    console.log("user buy " + userInversAmount);
    // console.log("user buy " + JSON.stringify(callResult, null, 2));
    for(let rawLog of callResult.receipt.rawLogs) {
        let data = rawLog.data;
        data = data.replace("0x", "");
        // data = data.replace("00", "");
        console.log(hex2a(data));
    }

    
    console.log("userAccount usdcBalance: " +  await usdc.balanceOf(userAccount));
    console.log("userAccount ausdcBalance: " + await ausdc.balanceOf(userAccount));
    console.log("userAccount a3CrvBalance: " + await a3Crv.balanceOf(userAccount));
    console.log("userAccount ovnBalance: " + await ovn.balanceOf(userAccount));
    
    console.log("vault usdcBalance: " +  await usdc.balanceOf(vault.address));
    console.log("vault ausdcBalance: " + await ausdc.balanceOf(vault.address));
    console.log("vault a3CrvBalance: " + await a3Crv.balanceOf(vault.address));
  
    // await usdc.approve(exchange.address, userInversAmount);
    // console.log("user approve " + userInversAmount);
    // callResult = await exchange.buy(usdc.address, userInversAmount);
    // console.log("user buy " + userInversAmount);
    // console.log("user buy " + JSON.stringify(callResult, null, 2));

    
    // console.log("userAccount usdcBalance: " +  await usdc.balanceOf(userAccount));
    // console.log("userAccount ausdcBalance: " + await ausdc.balanceOf(userAccount));
    // console.log("userAccount a3CrvBalance: " + await a3Crv.balanceOf(userAccount));
    // console.log("userAccount ovnBalance: " + await ovn.balanceOf(userAccount));
    
    // console.log("vault usdcBalance: " +  await usdc.balanceOf(vault.address));
    // console.log("vault ausdcBalance: " + await ausdc.balanceOf(vault.address));
    // console.log("vault a3CrvBalance: " + await a3Crv.balanceOf(vault.address));



    var ovnBalance = await ovn.balanceOf(userAccount);
    var withdrawAmount = parseInt(ovnBalance * 0.2, 10);
    console.log("userAccount redeem: " + withdrawAmount + " of " + ovnBalance);
    callResult = await exchange.redeem(usdc.address, withdrawAmount);
    console.log("user redeem " + withdrawAmount + " of " + ovnBalance);
    for(let rawLog of callResult.receipt.rawLogs) {
        let data = rawLog.data;
        data = data.replace("0x", "");
        // data = data.replace("00", "");
        console.log(hex2a(data));
    }

     
    console.log("userAccount usdcBalance: " +  await usdc.balanceOf(userAccount));
    console.log("userAccount ausdcBalance: " + await ausdc.balanceOf(userAccount));
    console.log("userAccount a3CrvBalance: " + await a3Crv.balanceOf(userAccount));
    console.log("userAccount ovnBalance: " + await ovn.balanceOf(userAccount));
    
    console.log("vault usdcBalance: " +  await usdc.balanceOf(vault.address));
    console.log("vault ausdcBalance: " + await ausdc.balanceOf(vault.address));
    console.log("vault a3CrvBalance: " + await a3Crv.balanceOf(vault.address));
   

    // await exchange.reward();
    // console.log("reward");

    // console.log("userAccount usdcBalance: " +  await usdc.balanceOf(userAccount));
    // console.log("userAccount ausdcBalance: " + await ausdc.balanceOf(userAccount));
    // console.log("userAccount a3CrvBalance: " + await a3Crv.balanceOf(userAccount));
    // console.log("userAccount ovnBalance: " + await ovn.balanceOf(userAccount));
    
    // console.log("vault usdcBalance: " +  await usdc.balanceOf(vault.address));
    // console.log("vault ausdcBalance: " + await ausdc.balanceOf(vault.address));
    // console.log("vault a3CrvBalance: " + await a3Crv.balanceOf(vault.address));


    ovnBalance = await ovn.balanceOf(userAccount);
    withdrawAmount = parseInt(ovnBalance * 0.96, 10);
    console.log("userAccount redeem: " + withdrawAmount + " of " + ovnBalance);
    await exchange.redeem(usdc.address, withdrawAmount);

     
    console.log("userAccount usdcBalance: " +  await usdc.balanceOf(userAccount));
    console.log("userAccount ausdcBalance: " + await ausdc.balanceOf(userAccount));
    console.log("userAccount a3CrvBalance: " + await a3Crv.balanceOf(userAccount));
    console.log("userAccount ovnBalance: " + await ovn.balanceOf(userAccount));
    
    console.log("vault usdcBalance: " +  await usdc.balanceOf(vault.address));
    console.log("vault ausdcBalance: " + await ausdc.balanceOf(vault.address));
    console.log("vault a3CrvBalance: " + await a3Crv.balanceOf(vault.address));
   
    // callback();

    }catch(error){
        console.log(error);
        
    }
    callback();
}
