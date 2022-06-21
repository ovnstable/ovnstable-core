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

    await deployProxy('StrategyBorrowDystopiaUsdcUsdt', deployments, save,
        {
            libraries: {
                "StrategyDystopiaUsdcUsdtLibrary": strategyDystopiaUsdcUsdtLibrary.address,
                "BalancerLibrary": balancerLibrary.address,
                "DystopiaLibrary": dystopiaLibrary.address,
            }
        },
        ["external-library-linking"]
    );
};

module.exports.tags = ['base', 'StrategyBorrowDystopiaUsdcUsdt'];
