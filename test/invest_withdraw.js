const Exchange = artifacts.require("Exchange");
const USDC = artifacts.require("USDCtest")
const PortfolioManager = artifacts.require("PortfolioManager")
const Vault = artifacts.require("Vault")
const InvestmentPortfolio = artifacts.require("registries/InvestmentPortfolio")
const BuyonSwap = artifacts.require("tests/BuyonSwap.sol")
const OvernightToken = artifacts.require("OvernightToken")

module.exports = async function (callback) {
    let accounts = await web3.eth.getAccounts()
    let userAccount = accounts[0];

    console.log("userAccount: " + userAccount);
    const ovn = await OvernightToken.deployed();
    const pm = await PortfolioManager.deployed();
    let exchange = await Exchange.deployed();
    let vault = await Vault.deployed();
    let investmentPortfolio = await InvestmentPortfolio.deployed();


    const contract = new web3.eth.Contract(exchange.abi, exchange.address)
    let usdc = await USDC.at("0x2791bca1f2de4661ed88a30c99a7a9449aa84174");
    let ausdc = await USDC.at("0x1a13F4Ca1d028320A707D99520AbFefca3998b7F");
 
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

    
    console.log("userAccount usdcBalance: " +  await usdc.balanceOf(userAccount));
    console.log("userAccount ausdcBalance: " + await ausdc.balanceOf(userAccount));
    console.log("userAccount ovnBalance: " + await ovn.balanceOf(userAccount));

    var userInversAmount = 100000 * 1000000;

    await usdc.approve(exchange.address, userInversAmount);
    console.log("user approve " + userInversAmount);
    await exchange.buy(usdc.address, userInversAmount);
    console.log("user buy " + userInversAmount);

    
    console.log("userAccount usdcBalance: " +  await usdc.balanceOf(userAccount));
    console.log("userAccount ausdcBalance: " + await ausdc.balanceOf(userAccount));
    console.log("userAccount ovnBalance: " + await ovn.balanceOf(userAccount));
    
    console.log("vault usdcBalance: " +  await usdc.balanceOf(vault.address));
    console.log("vault ausdcBalance: " + await ausdc.balanceOf(vault.address));
  
    await usdc.approve(exchange.address, userInversAmount);
    console.log("user approve " + userInversAmount);
    await exchange.buy(usdc.address, userInversAmount);
    console.log("user buy " + userInversAmount);

    
    console.log("userAccount usdcBalance: " +  await usdc.balanceOf(userAccount));
    console.log("userAccount ausdcBalance: " + await ausdc.balanceOf(userAccount));
    console.log("userAccount ovnBalance: " + await ovn.balanceOf(userAccount));
    
    console.log("vault usdcBalance: " +  await usdc.balanceOf(vault.address));
    console.log("vault ausdcBalance: " + await ausdc.balanceOf(vault.address));

    var ovnBalance = await ovn.balanceOf(userAccount);
    var withdrawAmount = parseInt(ovnBalance * 0.2, 10);
    console.log("userAccount redeem: " + withdrawAmount);
    await exchange.redeem(usdc.address, withdrawAmount);

     
    console.log("userAccount usdcBalance: " +  await usdc.balanceOf(userAccount));
    console.log("userAccount ausdcBalance: " + await ausdc.balanceOf(userAccount));
    console.log("userAccount ovnBalance: " + await ovn.balanceOf(userAccount));
    
    console.log("vault usdcBalance: " +  await usdc.balanceOf(vault.address));
    console.log("vault ausdcBalance: " + await ausdc.balanceOf(vault.address));
     

    await exchange.reward();
    console.log("reward");

    console.log("userAccount usdcBalance: " +  await usdc.balanceOf(userAccount));
    console.log("userAccount ausdcBalance: " + await ausdc.balanceOf(userAccount));
    console.log("userAccount ovnBalance: " + await ovn.balanceOf(userAccount));
    
    console.log("vault usdcBalance: " +  await usdc.balanceOf(vault.address));
    console.log("vault ausdcBalance: " + await ausdc.balanceOf(vault.address));


    ovnBalance = await ovn.balanceOf(userAccount);
    withdrawAmount = ovnBalance;
    console.log("userAccount redeem: " + withdrawAmount);
    await exchange.redeem(usdc.address, withdrawAmount);

     
    console.log("userAccount usdcBalance: " +  await usdc.balanceOf(userAccount));
    console.log("userAccount ausdcBalance: " + await ausdc.balanceOf(userAccount));
    console.log("userAccount ovnBalance: " + await ovn.balanceOf(userAccount));
    
    console.log("vault usdcBalance: " +  await usdc.balanceOf(vault.address));
    console.log("vault ausdcBalance: " + await ausdc.balanceOf(vault.address));
    
    callback();
}
