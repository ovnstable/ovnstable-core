const ConnectorCurve = artifacts.require("./connectors/ConnectorCurve.sol");

const Usdc2AUsdcActionBuilder = artifacts.require("./action_builders/Usdc2AUsdcActionBuilder.sol")

const AUsdc2A3CrvActionBuilder = artifacts.require("./action_builders/AUsdc2A3CrvActionBuilder.sol")
const AUsdc2A3CrvTokenExchange = artifacts.require("./token_exchanges/AUsdc2A3CrvTokenExchange.sol")


let usdc = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"
let aUsdc = "0x1a13F4Ca1d028320A707D99520AbFefca3998b7F"
let a3Crv = "0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171"
let a3CrvGauge = "0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c"
let crv = "0x172370d5Cd63279eFa6d502DAB29171933a610AF"
let wMatic = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"

let swapRouter = "0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff"
let curveGaugeAddress = "0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c"

module.exports = async function (deployer) {
    
    const connCurve = await ConnectorCurve.deployed();
    const usdc2AUsdcActionBuilder = await Usdc2AUsdcActionBuilder.deployed();

    await deployer.deploy(
        AUsdc2A3CrvTokenExchange,
        connCurve.address, // IConnector _aaveConnector,
        aUsdc, // IERC20 _usdcToken,
        a3Crv // IERC20 _aUsdcToken
    );
    const aUsdc2A3CrvTokenExchange = await AUsdc2A3CrvTokenExchange.deployed();

    await deployer.deploy(
        AUsdc2A3CrvActionBuilder,
        aUsdc2A3CrvTokenExchange.address, // address _tokenExchange,
        aUsdc, // address _aUsdcToken,
        a3Crv, // address _a3CrvToken,
        usdc2AUsdcActionBuilder.address // address _usdc2AUsdcActionBuilder
    );
    const aUsdc2A3CrvActionBuilder = await AUsdc2A3CrvActionBuilder.deployed();
};
