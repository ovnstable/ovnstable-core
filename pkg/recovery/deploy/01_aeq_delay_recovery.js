const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {getNamedAccounts} = require("hardhat");

module.exports = async ({deployments}) => {
    const {save, deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const token = await deploy("AeqDelayRecovery", {
        from: deployer,
        args: ['403060639977506842788174'],
        log: true,
        skipIfAlreadyDeployed: true
    });

    console.log('AeqDelayRecovery deployed done()');
};

module.exports.tags = ['AeqDelayRecovery'];
