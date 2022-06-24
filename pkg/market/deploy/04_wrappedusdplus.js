const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {save} = deployments;

    const usdPlusToken = await getContract("UsdPlusToken");

    let params = { args: [usdPlusToken.address] };

    await deployProxy('WrappedUsdPlusToken', deployments, save, params);

    console.log("WrappedUsdPlusToken created");
};

module.exports.tags = ['base', 'WrappedUsdPlusToken'];
