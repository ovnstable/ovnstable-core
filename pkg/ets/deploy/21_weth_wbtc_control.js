const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");

module.exports = async (plugin) => {
    const {deploy} = plugin.deployments;
    const {deployer} = await plugin.getNamedAccounts();
    const {save} = plugin.deployments;

    const etsCalculationLibrary2 = await deploy("EtsCalculationLibrary2", {
        from: deployer
    });

    let params = {
        factoryOptions: {
            libraries: {
                "EtsCalculationLibrary2": etsCalculationLibrary2.address
            }
        },
        unsafeAllow: ["external-library-linking"]
    };

    await deployProxy('ControlWethWbtc', plugin.deployments, save, params);

    const strategy = await ethers.getContract("StrategyWethWbtc");
    const control = await ethers.getContract('ControlWethWbtc');

    await (await control.grantRole(await control.STRATEGY_ROLE(), strategy.address)).wait();
    console.log('GrantRole: STRATEGY_ROLE() done()')
};

module.exports.tags = ['ControlWethWbtc'];
