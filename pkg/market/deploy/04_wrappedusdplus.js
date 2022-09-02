const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const hre = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {save} = deployments;

    const usdPlusToken = await getContract("UsdPlusToken");

    let params;

    if (hre.network.name === "bsc_usdc") {
        params = {args: [usdPlusToken.address, "Wrapped cUSD+", "wcUSD+"]}
    } else if (hre.network.name === "bsc_usdt") {
        params = {args: [usdPlusToken.address, "Wrapped tUSD+", "wtUSD+"]}
    } else {
        params = {args: [usdPlusToken.address, "Wrapped USD+", "wUSD+"]};
    }

    await deployProxy('WrappedUsdPlusToken', deployments, save, params);

    console.log("WrappedUsdPlusToken created");
};

module.exports.tags = ['base', 'WrappedUsdPlusToken'];
