const OvernightToken = artifacts.require("OvernightToken");
const Exchange = artifacts.require("Exchange");

module.exports = async function (deployer) {

    let usdc = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174";
    const ovnt = await OvernightToken.deployed();
    const exchange = await Exchange.deployed();
    await exchange.setTokens(ovnt.address, usdc);
};
