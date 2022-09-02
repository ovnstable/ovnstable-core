const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async (plugin) => {
    const {deploy} = plugin.deployments;
    const {deployer} = await plugin.getNamedAccounts();
    const {save} = plugin.deployments;

    const busdWbnbLibrary = await deploy("BusdWbnbLibrary", {
        from: deployer
    });

    let params = {
        factoryOptions: {
            libraries: {
                "BusdWbnbLibrary": busdWbnbLibrary.address
            }
        },
        unsafeAllow: ["external-library-linking"]
    };

    await deployProxy('StrategyBusdWbnb', plugin.deployments, save, params);


};

module.exports.tags = ['StrategyBusdWbnb'];
