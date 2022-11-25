const {deployProxy, deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");

module.exports = async ({deployments, getNamedAccounts}) => {
    const {save} = deployments;
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    await deployProxy('InsuranceExchange', deployments, save);
    await deployProxyMulti('InsuranceToken', 'RebaseToken', deployments, save, {});

    await deployProxyMulti('InsurancePortfolioManager', 'PortfolioManager', deployments, save, {});
    await deployProxyMulti('InsuranceMark2Market', 'Mark2Market', deployments, save, {});

};

module.exports.tags = ['Insurance'];
