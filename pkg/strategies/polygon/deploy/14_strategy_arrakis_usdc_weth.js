const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();
    const {save} = deployments;

    const strategyArrakisWethLibrary = await deploy("StrategyArrakisWethLibrary", {
        from: deployer
    });

    const balancerLibrary = await deploy("BalancerLibrary", {
        from: deployer
    });

    let params = {
        factoryOptions: {
            libraries: {
                "StrategyArrakisWethLibrary": strategyArrakisWethLibrary.address,
                "BalancerLibrary": balancerLibrary.address,
            }
        },
        unsafeAllow: ["external-library-linking"]
    };

    await deployProxy('StrategyArrakisWeth', deployments, save, params);
};

module.exports.tags = ['base', 'StrategyArrakisWeth'];
