const { ARBITRUM } = require("@overnight-contracts/common/utils/assets");
const {ethers} = require("hardhat");
const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();
    const {save} = deployments;


    let whitelist = await ethers.getContract('Whitelist');
    let overflowICO = await ethers.getContract('OverflowICO');
    let partnerNft = await ethers.getContract("WhitelistNFT");

    await whitelist.setParams({
        serviceNft: '0x512cC325BAE1Dd4590F6D67733aAf8e6a0526eaB', // NFT Galxe
        partnerNft: partnerNft.address,
        guarded: overflowICO.address,
    });
};

module.exports.tags = ['WhitelistSetting'];
