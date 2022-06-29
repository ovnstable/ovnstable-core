const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deployProxyMulti('RebaseUsdPlusWmatic', 'RebaseToken', deployments, save, null);
    console.log("RebaseUsdPlusWmatic created");
};

module.exports.tags = ['RebaseUsdPlusWmatic'];
