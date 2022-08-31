const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async (plugin) => {
    const {deploy} = plugin.deployments;
    const {deployer} = await plugin.getNamedAccounts();
    const {save} = plugin.deployments;



    const usdPlusWbnbLibrary = await deploy("UsdPlusWbnbLibrary", {
        from: deployer
    });


    let params = {
        factoryOptions: {
            libraries: {
                "UsdPlusWbnbLibrary": usdPlusWbnbLibrary.address,
            }
        },
        unsafeAllow: ["external-library-linking"]
    };

    await deployProxy('StrategyUsdPlusWbnb', plugin.deployments, save, params);


};

module.exports.tags = ['StrategyUsdPlusWbnb'];
