const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {getContract, getWalletAddress, transferETH, initWallet} = require("@overnight-contracts/common/utils/script-utils");
const {COMMON} = require("@overnight-contracts/common/utils/assets");
const hre = require("hardhat");
const { Deployer } = require("@matterlabs/hardhat-zksync-deploy");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    if ( hre.network.name === 'localhost') await transferETH(1, await getWalletAddress());

    const deployer = new Deployer(hre, await initWallet());

    let implArtifact = await deployer.loadArtifact('Exchange');

    const contract = await deployer.deploy(implArtifact, []);
 
    await contract.deployed();
    console.log('contract deployed to:', contract.address); 
 

};
 

module.exports.tags = ['ZkSyncExchange'];
