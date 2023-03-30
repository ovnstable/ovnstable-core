const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");

const {Deployer} = require("@matterlabs/hardhat-zksync-deploy");
const hre = require('hardhat');
const {initWallet} = require("@overnight-contracts/common/utils/script-utils");
const {Wallet} = require("zksync-web3");
module.exports = async ({deployments}) => {
    const {save} = deployments;
    // await deployProxy('Exchange', deployments, save);

    // Test wallet
    // https://github.com/matter-labs/local-setup/blob/main/rich-wallets.json
    const deployer = new Deployer(hre, new Wallet('0x7726827caac94a7f9e1b160f7ea819f172f7b6f9d2a97f992c38edeab82d4110'));

    let exchangeArtifact = await deployer.loadArtifact('Exchange');

    await save(exchangeArtifact.contractName, {
        address: 'test',
        implementation: 'implt',
        ...exchangeArtifact
    })
    const exchange = await deployer.deploy(exchangeArtifact, []);

    console.log(`${exchangeArtifact.contractName} deployed ` + exchange.address);
};

module.exports.tags = ['base', 'Exchange'];
