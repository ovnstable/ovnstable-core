const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();
    const {save} = deployments;

    const strategyArrakisWmaticLibrary = await deploy("StrategyArrakisWmaticLibrary", {
        from: deployer
    });

    const balancerLibrary = await deploy("BalancerLibrary", {
        from: deployer
    });

    let params = {
        factoryOptions: {
            libraries: {
                "StrategyArrakisWmaticLibrary": strategyArrakisWmaticLibrary.address,
                "BalancerLibrary": balancerLibrary.address,
            }
        },
        unsafeAllow: ["external-library-linking"]
    };

    await deployProxy('StrategyArrakisWmatic', deployments, save, params);
};

module.exports.tags = ['base', 'StrategyArrakisWmatic'];
