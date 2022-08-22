const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async (plugin) => {
    const {deploy} = plugin.deployments;
    const {deployer} = await plugin.getNamedAccounts();
    const {save} = plugin.deployments;



    const usdPlusWmaticLibrary = await deploy("UsdPlusWmaticLibrary", {
        from: deployer
    });

    const etsCalculationLibrary = await deploy("EtsCalculationLibrary", {
        from: deployer
    });

    let params = {
        factoryOptions: {
            libraries: {
                "UsdPlusWmaticLibrary": usdPlusWmaticLibrary.address,
                "EtsCalculationLibrary": etsCalculationLibrary.address
            }
        },
        unsafeAllow: ["external-library-linking"]
    };

    await deployProxy('StrategyUsdPlusWmatic', plugin.deployments, save, params);


};

module.exports.tags = ['StrategyUsdPlusWmatic'];
