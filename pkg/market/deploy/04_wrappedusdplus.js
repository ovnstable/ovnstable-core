const {deployProxyWithArgs} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {save} = deployments;

    let usdPlusToken;
    if (process.env.STAND === "polygon_dev") {
        usdPlusToken = '0x8E285353cc976cF1b1138Cb66A95A26157f3340C';
    } else if (process.env.STAND === "polygon") {
        usdPlusToken = '0x236eeC6359fb44CCe8f97E99387aa7F8cd5cdE1f';
    }
    console.log("usdPlusToken set: " + usdPlusToken);

    await deployProxyWithArgs('WrappedUsdPlusToken', deployments, save, {}, [], [usdPlusToken]);

    console.log("WrappedUsdPlusToken created");
};


module.exports.tags = ['base', 'WrappedUsdPlusToken'];
