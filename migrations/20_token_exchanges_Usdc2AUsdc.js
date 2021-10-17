const ConnectorAAVE = artifacts.require("./connectors/ConnectorAAVE.sol");

const Usdc2AUsdcActionBuilder = artifacts.require("./action_builders/Usdc2AUsdcActionBuilder.sol")
const Usdc2AUsdcTokenExchange = artifacts.require("./token_exchanges/Usdc2AUsdcTokenExchange.sol")


let usdc = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"
let aUsdc = "0x1a13F4Ca1d028320A707D99520AbFefca3998b7F"
let a3Crv = "0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171"
let a3CrvGauge = "0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c"
let crv = "0x172370d5Cd63279eFa6d502DAB29171933a610AF"
let wMatic = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"

let swapRouter = "0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff"
let curveGaugeAddress = "0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c"

module.exports = async function (deployer) {

    const connAAVE = await ConnectorAAVE.deployed();

    await deployer.deploy(
        Usdc2AUsdcTokenExchange,
        connAAVE.address, // IConnector _aaveConnector,
        usdc, // IERC20 _usdcToken,
        aUsdc // IERC20 _aUsdcToken
    );
    const usdc2AUsdcTokenExchange = await Usdc2AUsdcTokenExchange.deployed();

    await deployer.deploy(
        Usdc2AUsdcActionBuilder,
        usdc2AUsdcTokenExchange.address, // tokenExchange = _tokenExchange;
        usdc, // usdcToken = _usdcToken;
        aUsdc // aUsdcToken = _aUsdcToken;
    );
    const usdc2AUsdcActionBuilder = await Usdc2AUsdcActionBuilder.deployed();
};
