const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const exchange = await ethers.getContract("Exchange");
    const ovn = await ethers.getContract("OvernightToken");
    const m2m = await ethers.getContract("Mark2Market");
    const pm = await ethers.getContract("PortfolioManager");

    await exchange.setTokens(ovn.address, assets.usdc);
    console.log("exchange.setTokens done");

    // setup exchange
    await exchange.setAddr(pm.address, m2m.address);
    console.log("exchange.setAddr done")

};

module.exports.tags = ['Setting'];
