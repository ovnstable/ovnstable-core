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

    await deployProxy('StrategyArrakisWmatic', deployments, save,
        {
            libraries: {
                "StrategyArrakisWmaticLibrary": strategyArrakisWmaticLibrary.address,
                "BalancerLibrary": balancerLibrary.address,
            }
        },
        ["external-library-linking"]
    );
};

module.exports.tags = ['base', 'StrategyArrakisWmatic'];
