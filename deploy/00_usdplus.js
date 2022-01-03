const {ethers, upgrades} = require("hardhat");
module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy, save} = deployments;
    const {deployer} = await getNamedAccounts();

    const UsdPlusToken = await ethers.getContractFactory('UsdPlusToken');

    let proxy;
    try {
        proxy = await ethers.getContract('UsdPlusToken');
    } catch (e) {
    }

    if (!proxy){
        console.log('Proxy UsdPlusToken not found')
        proxy = await upgrades.deployProxy(UsdPlusToken, {kind: 'uups'});
        console.log('Deploy UsdPlusToken Proxy done -> ' + proxy.address);
    }else {
        console.log('Proxy UsdPlusToken found -> ' + proxy.address)
    }

    const impl = await upgrades.upgradeProxy(proxy, UsdPlusToken);
    console.log('Deploy UsdPlusToken Impl  done -> ' + impl.address);

    const artifact = await deployments.getExtendedArtifact('UsdPlusToken');
    let proxyDeployments = {
        address: proxy.address,
        ...artifact
    }

    await save('UsdPlusToken', proxyDeployments);
};

module.exports.tags = ['base', 'UsdPlusToken'];
