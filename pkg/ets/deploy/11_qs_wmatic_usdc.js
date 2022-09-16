const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async (plugin) => {
    const {deploy} = plugin.deployments;
    const {deployer} = await plugin.getNamedAccounts();
    const {save} = plugin.deployments;

    const library = await deploy("QsWmaticUsdcLibrary", {
        from: deployer
    });

    let params = {
        factoryOptions: {
            libraries: {
                "QsWmaticUsdcLibrary": library.address
            }
        },
        unsafeAllow: ["external-library-linking"]
    };

    await deployProxy('StrategyQsWmaticUsdc', plugin.deployments, save, params);
};

module.exports.tags = ['StrategyQsWmaticUsdc'];
