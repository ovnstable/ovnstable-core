const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async ({deployments}) => {
    const {deploy, save} = deployments;
    const {deployer} = await getNamedAccounts();

    const traderJoeLibrary = await deploy("TraderJoeLibrary", {
        from: deployer
    });

    await deployProxy('StrategyVectorUsdc', deployments, save,
        {
            libraries: {
                "TraderJoeLibrary": traderJoeLibrary.address,
            }
        },
        ["external-library-linking"]
    );
};

module.exports.tags = ['base', 'StrategyVectorUsdc'];