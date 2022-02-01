const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

const router = "0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff"

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    await deploy('BuyonSwap', {
        from: deployer,
        args: [],
        log: true,
    });
    console.log("Deploy BuyonSwap done");

    let value = "500000000000000000000000";

    const buyonSwap = await ethers.getContract("BuyonSwap");
    await buyonSwap.buy(assets.amUsdc, router, {value: value});

    console.log('Buy amUsdc: ' + value);
};

module.exports.tags = ['test', 'BuyAmUsdc'];
