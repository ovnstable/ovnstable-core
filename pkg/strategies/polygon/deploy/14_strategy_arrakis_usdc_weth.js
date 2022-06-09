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

    await deployProxy('StrategyArrakisWeth', deployments, save,
        {
            libraries: {
                "StrategyArrakisWethLibrary": strategyArrakisWethLibrary.address,
                "BalancerLibrary": balancerLibrary.address,
            }
        },
        ["external-library-linking"]
    );
};

module.exports.tags = ['base', 'StrategyArrakisWeth'];
