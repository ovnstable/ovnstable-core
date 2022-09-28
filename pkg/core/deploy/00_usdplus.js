const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const hre = require("hardhat");
const {ethers} = require("hardhat");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    let params;

    if (hre.network.name === "bsc_usdc") {
        params = {args: ["cUSD+", "cUSD+"]}
    } else if (hre.network.name === "bsc_usdt") {
        params = {args: ["tUSD+", "tUSD+"]}
    } else if (hre.network.name === "optimism_dai") {
        params = {args: ["DAI+", "DAI+"]}
    } else {
        params = {args: ["USD+", "USD+"]};
    }
    await deployProxy('UsdPlusToken', deployments, save, params);

    let usdPlus = await ethers.getContract('UsdPlusToken');

    console.log('UsdPlusToken deploy done()');
    console.log('Symbol:   ' + await usdPlus.symbol());
    console.log('Name:     ' + await usdPlus.name());
    console.log('Decimals: ' + await usdPlus.decimals());

};

module.exports.tags = ['base', 'UsdPlusToken'];
