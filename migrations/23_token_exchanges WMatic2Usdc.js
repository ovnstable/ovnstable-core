const WMatic2UsdcActionBuilder = artifacts.require("./action_builders/WMatic2UsdcActionBuilder.sol")
const WMatic2UsdcTokenExchange = artifacts.require("./token_exchanges/WMatic2UsdcTokenExchange.sol")


let usdc = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"
let aUsdc = "0x1a13F4Ca1d028320A707D99520AbFefca3998b7F"
let a3Crv = "0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171"
let a3CrvGauge = "0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c"
let crv = "0x172370d5Cd63279eFa6d502DAB29171933a610AF"
let wMatic = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"

let swapRouter = "0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff"
let curveGaugeAddress = "0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c"

module.exports = async function (deployer) {
    await deployer.deploy(
        WMatic2UsdcTokenExchange,
        swapRouter, // address _swapRouter
        usdc, // address _usdcToken
        wMatic, // address _wMaticToken
    );
    const wMatic2UsdcTokenExchange = await WMatic2UsdcTokenExchange.deployed();

    await deployer.deploy(
        WMatic2UsdcActionBuilder,
        wMatic2UsdcTokenExchange.address, // address _tokenExchange,
        usdc, // address _usdcToken,
        wMatic, // address _wMaticToken
    );
    const wMatic2UsdcActionBuilder = await WMatic2UsdcActionBuilder.deployed();
};
