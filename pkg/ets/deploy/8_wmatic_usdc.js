const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async (plugin) => {
    const {deploy} = plugin.deployments;
    const {deployer} = await plugin.getNamedAccounts();
    const {save} = plugin.deployments;

    const library = await deploy("WmaticUsdcLibrary", {
        from: deployer
    });

    let params = {
        factoryOptions: {
            libraries: {
                "WmaticUsdcLibrary": library.address
            }
        },
        unsafeAllow: ["external-library-linking"]
    };

    await deployProxy('StrategyWmaticUsdc', plugin.deployments, save, params);
};

module.exports.tags = ['StrategyWmaticUsdc'];
