const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const hre = require("hardhat");
const {ethers} = require("hardhat");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    const usdPlusToken = await getContract("UsdPlusToken");

    let params;

    if (hre.network.name === "optimism_dai") {
        params = {args: [usdPlusToken.address, "Wrapped DAI+", "wDAI+", 18]};
    } else if (hre.network.name === "arbitrum_dai") {
        params = {args: [usdPlusToken.address, "Wrapped DAI+", "wDAI+", 18]};
    } else if (hre.network.name === "bsc_usdt") {
        params = {args: [usdPlusToken.address, "Wrapped USDT+", "wUSDT+", 18]};
    } else {
        params = {args: [usdPlusToken.address, "Wrapped USD+", "wUSD+", 6]};
    }

    await deployProxy('WrappedUsdPlusToken', deployments, save, params);

    console.log("WrappedUsdPlusToken created");

    let wrappedUsdPlusToken = await ethers.getContract('WrappedUsdPlusToken');

    console.log('WrappedUsdPlusToken deploy done()');
    console.log('Symbol:   ' + await wrappedUsdPlusToken.symbol());
    console.log('Name:     ' + await wrappedUsdPlusToken.name());
    console.log('Decimals: ' + await wrappedUsdPlusToken.decimals());
};

module.exports.tags = ['base', 'WrappedUsdPlusToken'];
