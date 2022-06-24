const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();
    const {save} = deployments;

    const strategyDystopiaUsdcUsdtLibrary = await deploy("StrategyDystopiaUsdcUsdtLibrary", {
        from: deployer
    });

    const balancerLibrary = await deploy("BalancerLibrary", {
        from: deployer
    });

    const dystopiaLibrary = await deploy("DystopiaLibrary", {
        from: deployer
    });

    let params = {
        factoryOptions: {
            libraries: {
                "StrategyDystopiaUsdcUsdtLibrary": strategyDystopiaUsdcUsdtLibrary.address,
                "BalancerLibrary": balancerLibrary.address,
                "DystopiaLibrary": dystopiaLibrary.address,
            }
        },
        unsafeAllow: ["external-library-linking"]
    };

    await deployProxy('StrategyBorrowDystopiaUsdcUsdt', deployments, save, params);
};

module.exports.tags = ['base', 'StrategyBorrowDystopiaUsdcUsdt'];
