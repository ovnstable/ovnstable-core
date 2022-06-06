const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();
    const {save} = deployments;

    const strategyArrakisUsdtLibrary = await deploy("StrategyArrakisUsdtLibrary", {
        from: deployer
    });

    await deployProxy('StrategyArrakisUsdt', deployments, save,
        {
            libraries: {
                "StrategyArrakisUsdtLibrary": strategyArrakisUsdtLibrary.address,
            }
        },
        ["external-library-linking"]
    );
};

module.exports.tags = ['base', 'StrategyArrakisUsdt'];
