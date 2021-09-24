const Exchange = artifacts.require("Exchange");
const ActivesList = artifacts.require("./registres/ActivesList.sol");
const Mark2Market = artifacts.require("./Mark2Market.sol");
const PortfolioManager = artifacts.require("./PortfolioManager.sol")
const OvernightToken = artifacts.require("OvernightToken");

const ConnectorAAVE = artifacts.require("./connectors/ConnectorAAVE.sol");
const Vault = artifacts.require("./Vault.sol")
const Balancer = artifacts.require("./Balancer.sol")
const InvestmentPortfolio = artifacts.require("./regetries/InvestmentPortfolio.sol")
const Usdc2AUsdcActionBuilder = artifacts.require("./action_builders/Usdc2AUsdcActionBuilder.sol")
const Usdc2AUsdcTokenExchange = artifacts.require("./token_exchanges/Usdc2AUsdcTokenExchange.sol")
const ERC20 = artifacts.require("@openzeppelin/contracts/token/ERC20/ERC20.sol")

module.exports = async function (deployer) {

    let usdc = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"
    let aUsdc = "0x1a13F4Ca1d028320A707D99520AbFefca3998b7F"
    // let usdc = await ERC20.at('0x2791bca1f2de4661ed88a30c99a7a9449aa84174');
    // let aUsdc = await ERC20.at("0x1a13F4Ca1d028320A707D99520AbFefca3998b7F");

    
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
        minWeight: 25000,
        targetWeight: 50000,
        maxWeight: 60000,
    }
    let aUsdcWeight = {
        asset: aUsdc,
        minWeight: 25000,
        targetWeight: 50000,
        maxWeight: 60000,
    }
    let weights = [
        usdcWeight,
        aUsdcWeight
    ]
    let result = await investmentPortfolio.setWeights(weights);
    console.log("setWeights: " + result);


    const connAAVE = await ConnectorAAVE.deployed();

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
        usdc,// usdcToken = _usdcToken;
        aUsdc // aUsdcToken = _aUsdcToken;
    );
    const usdc2AUsdcActionBuilder = await Usdc2AUsdcActionBuilder.deployed();



    const actList = await ActivesList.deployed();
    const ovn = await OvernightToken.deployed();
    const exchange = await Exchange.deployed();
    const m2m = await Mark2Market.deployed();
    const pm = await PortfolioManager.deployed();

    await m2m.setAddr(actList.address, pm.address);
    await pm.setAddr(actList.address)
    await exchange.setAddr(actList.address, pm.address, m2m.address);

    // set pm
    await vault.setPortfolioManager(pm.address);
    await pm.setVault(vault.address);
    await pm.setBalancer(balancer.address);

    await balancer.setMark2Market(m2m.address);

    await m2m.init(vault.address, investmentPortfolio.address);

    // set actions builders
    console.log("aaaaa");
    let res = await balancer.addActionBuilderAt(usdc2AUsdcActionBuilder.address, 0);
    console.log("bbbb");



    // Set role EX
    await ovn.setExchanger(exchange.address);
};
