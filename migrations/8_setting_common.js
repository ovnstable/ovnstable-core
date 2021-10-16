const Exchange = artifacts.require("Exchange");
const ActivesList = artifacts.require("./registres/ActivesList.sol");
const Mark2Market = artifacts.require("./Mark2Market.sol");
const PortfolioManager = artifacts.require("./PortfolioManager.sol")
const OvernightToken = artifacts.require("OvernightToken");

const ConnectorAAVE = artifacts.require("./connectors/ConnectorAAVE.sol");
const ConnectorCurve = artifacts.require("./connectors/ConnectorCurve.sol");

const Vault = artifacts.require("./Vault.sol")
const Balancer = artifacts.require("./Balancer.sol")
const InvestmentPortfolio = artifacts.require("./regetries/InvestmentPortfolio.sol")

const Usdc2AUsdcActionBuilder = artifacts.require("./action_builders/Usdc2AUsdcActionBuilder.sol")
const Usdc2AUsdcTokenExchange = artifacts.require("./token_exchanges/Usdc2AUsdcTokenExchange.sol")

const AUsdc2A3CrvActionBuilder = artifacts.require("./action_builders/AUsdc2A3CrvActionBuilder.sol")
const AUsdc2A3CrvTokenExchange = artifacts.require("./token_exchanges/AUsdc2A3CrvTokenExchange.sol")

const A3Crv2A3CrvGaugeActionBuilder = artifacts.require("./action_builders/A3Crv2A3CrvGaugeActionBuilder.sol")
const A3Crv2A3CrvGaugeTokenExchange = artifacts.require("./token_exchanges/A3Crv2A3CrvGaugeTokenExchange.sol")

const WMatic2UsdcActionBuilder = artifacts.require("./action_builders/WMatic2UsdcActionBuilder.sol")
const WMatic2UsdcTokenExchange = artifacts.require("./token_exchanges/WMatic2UsdcTokenExchange.sol")

const ERC20 = artifacts.require("@openzeppelin/contracts/token/ERC20/ERC20.sol")

module.exports = async function (deployer) {

    let usdc = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"
    let aUsdc = "0x1a13F4Ca1d028320A707D99520AbFefca3998b7F"
    let a3Crv = "0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171"
    let a3CrvGauge = "0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c"
    let crv = "0x172370d5Cd63279eFa6d502DAB29171933a610AF"
    let wMatic = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"
 
    // let usdc = await ERC20.at('0x2791bca1f2de4661ed88a30c99a7a9449aa84174');
    // let aUsdc = await ERC20.at("0x1a13F4Ca1d028320A707D99520AbFefca3998b7F");
 
    //TODO: move all deploy to its own scripts
    // vault
    await deployer.deploy(Vault);
    const vault = await Vault.deployed();

    // balancer
    await deployer.deploy(Balancer);
    const balancer = await Balancer.deployed();
    
    // balancer
    await deployer.deploy(InvestmentPortfolio);
    const investmentPortfolio = await InvestmentPortfolio.deployed();

    let usdcWeight = {
        asset: usdc,
        minWeight: 0,
        targetWeight: 10000,
        maxWeight: 100000,
    }
    let aUsdcWeight = {
        asset: aUsdc,
        minWeight: 0,
        targetWeight: 10000,
        maxWeight: 100000,
    }
    let a3CrvWeight = {
        asset: a3Crv,
        minWeight: 0,
        targetWeight: 30000,
        maxWeight: 100000,
    }
    let a3CrvGaugeWeight = {
        asset: a3CrvGauge,
        minWeight: 0,
        targetWeight: 50000,
        maxWeight: 100000,
    }
    let wMaticWeight = {
        asset: wMatic,
        minWeight: 0,
        targetWeight: 0,
        maxWeight: 100000,
    }
    let weights = [
        usdcWeight,
        aUsdcWeight,
        a3CrvWeight,
        a3CrvGaugeWeight,
        wMaticWeight
    ]
    let result = await investmentPortfolio.setWeights(weights);
    console.log("setWeights: " + result);


    const connAAVE = await ConnectorAAVE.deployed();
    const connCurve = await ConnectorCurve.deployed();

    // first token exchange
    await deployer.deploy(
        Usdc2AUsdcTokenExchange,
        connAAVE.address, // IConnector _aaveConnector,
        usdc, // IERC20 _usdcToken,
        aUsdc // IERC20 _aUsdcToken
    );
    const usdc2AUsdcTokenExchange = await Usdc2AUsdcTokenExchange.deployed();

    // first token exchange
    await deployer.deploy(
        Usdc2AUsdcActionBuilder,
        usdc2AUsdcTokenExchange.address, // tokenExchange = _tokenExchange;
        usdc, // usdcToken = _usdcToken;
        aUsdc // aUsdcToken = _aUsdcToken;
    );
    const usdc2AUsdcActionBuilder = await Usdc2AUsdcActionBuilder.deployed();

    // second token exchange
    await deployer.deploy(
        AUsdc2A3CrvTokenExchange,
        connCurve.address, // IConnector _aaveConnector,
        aUsdc, // IERC20 _usdcToken,
        a3Crv // IERC20 _aUsdcToken
    );
    const aUsdc2A3CrvTokenExchange = await AUsdc2A3CrvTokenExchange.deployed();

    // second token exchange
    await deployer.deploy(
        AUsdc2A3CrvActionBuilder,
        aUsdc2A3CrvTokenExchange.address, // address _tokenExchange,
        aUsdc, // address _aUsdcToken,
        a3Crv, // address _a3CrvToken,
        usdc2AUsdcActionBuilder.address // address _usdc2AUsdcActionBuilder
    );
    const aUsdc2A3CrvActionBuilder = await AUsdc2A3CrvActionBuilder.deployed();


    let curveGaugeAddress = "0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c"
    // third token exchange
    await deployer.deploy(
        A3Crv2A3CrvGaugeTokenExchange,
        curveGaugeAddress, // address _curveGauge
    );
    const a3Crv2A3CrvGaugeTokenExchange = await A3Crv2A3CrvGaugeTokenExchange.deployed();

    // third token exchange
    await deployer.deploy(
        A3Crv2A3CrvGaugeActionBuilder,
        a3Crv2A3CrvGaugeTokenExchange.address, // address _tokenExchange,
        a3Crv, // address _a3CrvToken,
        a3CrvGauge, // address _a3CrvGaugeToken
    );
    const a3Crv2A3CrvGaugeActionBuilder = await A3Crv2A3CrvGaugeActionBuilder.deployed();


    // Wmatic token exchange
    let swapRouter = "0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff"
    await deployer.deploy(
        WMatic2UsdcTokenExchange,
        swapRouter, // address _swapRouter
        usdc, // address _usdcToken
        wMatic, // address _wMaticToken
    );
    const wMatic2UsdcTokenExchange = await WMatic2UsdcTokenExchange.deployed();

    // Wmatic token exchange
    await deployer.deploy(
        WMatic2UsdcActionBuilder,
        wMatic2UsdcTokenExchange.address, // address _tokenExchange,
        usdc, // address _usdcToken,
        wMatic, // address _wMaticToken
    );
    const wMatic2UsdcActionBuilder = await WMatic2UsdcActionBuilder.deployed();
 


    const actList = await ActivesList.deployed();
    const ovn = await OvernightToken.deployed();
    const exchange = await Exchange.deployed();
    const m2m = await Mark2Market.deployed();
    const pm = await PortfolioManager.deployed();

    await m2m.setAddr(actList.address, pm.address);
    await exchange.setAddr(pm.address, m2m.address);

    // set pm
    await vault.setPortfolioManager(pm.address);
    await pm.setVault(vault.address);
    await pm.setBalancer(balancer.address);
    await pm.setExchanger(exchange.address);

    await balancer.setMark2Market(m2m.address);

    await m2m.init(vault.address, investmentPortfolio.address);

    // set actions builders in order
    await balancer.addActionBuilderAt(usdc2AUsdcActionBuilder.address, 0);
    await balancer.addActionBuilderAt(a3Crv2A3CrvGaugeActionBuilder.address, 1);
    await balancer.addActionBuilderAt(aUsdc2A3CrvActionBuilder.address, 2);
    await balancer.addActionBuilderAt(wMatic2UsdcActionBuilder.address, 3);


    // Set role EX
    await ovn.setExchanger(exchange.address);
};
