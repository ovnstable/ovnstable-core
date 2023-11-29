const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const hre = require("hardhat");
const {ethers} = require("hardhat");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    let params;

    if (hre.network.name === "optimism_dai") {
        params = {args: ["DAI+", "DAI+", 18]}
    } else if (hre.network.name === "arbitrum_dai") {
        params = {args: ["DAI+", "DAI+", 18]}
    } else if (hre.network.name === "arbitrum_eth") {
        params = {args: ["ETH+", "ETH+", 18]}
    } else if (hre.network.name === "bsc_usdt") {
        params = {args: ["USDT+", "USDT+", 18]}
    } else if (hre.network.name === 'base_dai') {
        params = {args: ["DAI+", "DAI+", 18]}
    } else if (hre.network.name === 'linea_usdt') {
        params = {args: ["USDT+", "USDT+", 6]}
    } else if (hre.network.name === 'arbitrum_usdt') {
        params = {args: ["USDT+", "USDT+", 6]}
    } else {
        params = {args: ["USD+", "USD+", 6]};
    }
    await deployProxy('UsdPlusTokenPure', deployments, save, params);

    let usdPlus = await ethers.getContract('UsdPlusTokenPure');

    console.log('UsdPlusToken deploy done()');
    console.log('Symbol:      ' + await usdPlus.symbol());
    console.log('Name:        ' + await usdPlus.name());
    console.log('Decimals:    ' + await usdPlus.decimals());
    console.log('totalSupply: ' + await usdPlus.totalSupply());

};

module.exports.tags = ['base', 'UsdPlusToken'];
