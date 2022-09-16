const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");

module.exports = async (plugin) => {
    const {deploy} = plugin.deployments;
    const {deployer} = await plugin.getNamedAccounts();
    const {save} = plugin.deployments;

    const etsCalculationLibrary = await deploy("EtsCalculationLibrary", {
        from: deployer
    });

    let params = {
        factoryOptions: {
            libraries: {
                "EtsCalculationLibrary": etsCalculationLibrary.address
            }
        },
        unsafeAllow: ["external-library-linking"]
    };

    await deployProxy('ControlWethUsdc', plugin.deployments, save, params);

    const strategy = await ethers.getContract("StrategyWethUsdc");
    const control = await ethers.getContract('ControlWethUsdc');

    await (await control.grantRole(await control.STRATEGY_ROLE(), strategy.address)).wait();
    console.log('GrantRole: STRATEGY_ROLE() done()')
};

module.exports.tags = ['ControlWethUsdc'];
