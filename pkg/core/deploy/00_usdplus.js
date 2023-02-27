const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const hre = require("hardhat");
const {ethers} = require("hardhat");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    let params;

    if (hre.network.name === "bsc_usdc") {
        params = {args: ["cUSD+", "cUSD+", 6]}
    } else if (hre.network.name === "bsc_usdt") {
        params = {args: ["tUSD+", "tUSD+", 6]}
    } else if (hre.network.name === "optimism_dai") {
        params = {args: ["DAI+", "DAI+", 18]}
    } else if (hre.network.name === "arbitrum_dai") {
        params = {args: ["DAI+", "DAI+", 18]}
    } else {
        params = {args: ["USD+", "USD+", 6]};
    }
    await deployProxy('UsdPlusToken', deployments, save, params);

    let usdPlus = await ethers.getContract('UsdPlusToken');

    console.log('UsdPlusToken deploy done()');
    console.log('Symbol:   ' + await usdPlus.symbol());
    console.log('Name:     ' + await usdPlus.name());
    console.log('Decimals: ' + await usdPlus.decimals());

};

module.exports.tags = ['base', 'UsdPlusToken'];
