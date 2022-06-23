const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();
    const {save} = deployments;

    const strategyArrakisUsdtLibrary = await deploy("StrategyArrakisUsdtLibrary", {
        from: deployer
    });

    const balancerLibrary = await deploy("BalancerLibrary", {
        from: deployer
    });

    let params = {
        factoryOptions: {
            libraries: {
                "StrategyArrakisUsdtLibrary": strategyArrakisUsdtLibrary.address,
                "BalancerLibrary": balancerLibrary.address,
            }
        },
        unsafeAllow: ["external-library-linking"]
    };

    await deployProxy('StrategyArrakisUsdt', deployments, save, params);
};

module.exports.tags = ['base', 'StrategyArrakisUsdt'];
