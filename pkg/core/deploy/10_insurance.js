const {deployProxy, deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");

module.exports = async ({deployments, getNamedAccounts}) => {
    const {save} = deployments;
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    await deployProxy('InsuranceExchange', deployments, save);
    await deployProxyMulti('InsuranceToken', 'RebaseToken', deployments, save, {});

    await deployProxy('PortfolioManager', deployments, save);
    await deployProxy('Mark2Market', deployments, save);

};

module.exports.tags = ['Insurance'];
