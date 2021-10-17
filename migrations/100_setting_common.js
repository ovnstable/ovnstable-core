const OvernightToken = artifacts.require("OvernightToken");
const Exchange = artifacts.require("Exchange");
const Mark2Market = artifacts.require("./Mark2Market.sol");
const PortfolioManager = artifacts.require("./PortfolioManager.sol")

const Vault = artifacts.require("./Vault.sol")
const Balancer = artifacts.require("./Balancer.sol")
const InvestmentPortfolio = artifacts.require("./regetries/InvestmentPortfolio.sol")


let usdc = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"
let aUsdc = "0x1a13F4Ca1d028320A707D99520AbFefca3998b7F"
let a3Crv = "0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171"
let a3CrvGauge = "0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c"
let crv = "0x172370d5Cd63279eFa6d502DAB29171933a610AF"
let wMatic = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"

let swapRouter = "0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff"
let curveGaugeAddress = "0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c"
let aCurvepoolStake = "0x445FE580eF8d70FF569aB36e80c647af338db351"

module.exports = async function (deployer) {

    // get deployed contracts
    const ovn = await OvernightToken.deployed();
    const exchange = await Exchange.deployed();
    const vault = await Vault.deployed();
    const balancer = await Balancer.deployed();
    const investmentPortfolio = await InvestmentPortfolio.deployed();
    const m2m = await Mark2Market.deployed();
    const pm = await PortfolioManager.deployed();

    // setup exchange
    await exchange.setAddr(pm.address, m2m.address);

    // setup pm
    await pm.setVault(vault.address);
    await pm.setBalancer(balancer.address);
    await pm.setExchanger(exchange.address);
    await pm.setRewardGauge(curveGaugeAddress);

    // setup vault
    await vault.setPortfolioManager(pm.address);

    // setup balancer
    await balancer.setMark2Market(m2m.address);

    // setup m2m
    await m2m.init(vault.address, investmentPortfolio.address);

    // setup OVN
    await ovn.setExchanger(exchange.address);
};
