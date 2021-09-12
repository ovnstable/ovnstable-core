const Exchange = artifacts.require("Exchange");
const USDC = artifacts.require("USDCtest")
const PortfolioManager = artifacts.require("PortfolioManager")

module.exports = async function (callback) {


    let exchange = await Exchange.deployed();

    const contract = new web3.eth.Contract(exchange.abi, exchange.address)
    let ovn = await USDC.at('0xCa551016676D0d88A2edeaF3E9Cb9cB2205F3f86');
    let usdc = await USDC.at('0x2791bca1f2de4661ed88a30c99a7a9449aa84174');
    let ausdc = await USDC.at('0x1a13F4Ca1d028320A707D99520AbFefca3998b7F');

    console.log("ovn: " + await ovn.totalSupply())
    console.log("usdc: " + await usdc.totalSupply())
    console.log("ausdc: " + await ausdc.totalSupply())

    // await usdc.approve(Exchange.address, 30);


    // let newVar = await contract.methods.buy(usdc.address, 30);

    // console.log('EVENTS')
    // console.log(newVar)



    let pm = await PortfolioManager.deployed();
    console.log("pm usdc: " + await usdc.balanceOf(pm.address));
    console.log("pm usdc at: " + await ausdc.balanceOf(pm.address));

    console.log(await exchange.reward());
    // console.log(await ausdc.balanceOf(pm.address));



}
