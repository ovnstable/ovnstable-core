const { ethers, upgrades} = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy, save} = deployments;
    const {deployer} = await getNamedAccounts();


    const ovnToken = await ethers.getContractFactory('OvnToken');

    let proxy;
    try {
        proxy = await ethers.getContract('OvnToken');
    } catch (e) {
    }

    if (!proxy){
        console.log('Proxy OvnToken not found')
        proxy = await upgrades.deployProxy(ovnToken, {kind: 'uups'});
        console.log('Deploy OvnToken Proxy done -> ' + proxy.address);
    }else {
        console.log('Proxy OvnToken found -> ' + proxy.address)
    }

    const impl = await upgrades.upgradeProxy(proxy, ovnToken);
    console.log('Deploy OvnToken Impl  done -> ' + impl.address);

    const artifact = await deployments.getExtendedArtifact('OvnToken');
    let proxyDeployments = {
        address: proxy.address,
        ...artifact
    }

    await save('OvnToken', proxyDeployments);

};

module.exports.tags = ['base','OvnToken'];
