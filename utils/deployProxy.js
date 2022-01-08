const {ethers, upgrades} = require("hardhat");

async function deployProxy(contractName, deployments, save) {

    const UsdPlusToken = await ethers.getContractFactory(contractName);

    let proxy;
    try {
        proxy = await ethers.getContract(contractName);
    } catch (e) {
    }

    if (!proxy) {
        console.log(`Proxy ${contractName} not found`)
        proxy = await upgrades.deployProxy(UsdPlusToken, {kind: 'uups'});
        console.log(`Deploy ${contractName} Proxy done -> ` + proxy.address);
    } else {
        console.log(`Proxy ${contractName} found -> ` + proxy.address)
    }

    let impl;
    try {
        impl = await upgrades.upgradeProxy(proxy, UsdPlusToken);
    } catch (e) {
        impl = await upgrades.upgradeProxy(proxy, UsdPlusToken);
    }
    console.log(`Deploy ${contractName} Impl  done -> ` + impl.address);

    const artifact = await deployments.getExtendedArtifact(contractName);
    let proxyDeployments = {
        address: proxy.address,
        ...artifact
    }

    await save(contractName, proxyDeployments);
    return proxyDeployments;
}


module.exports = deployProxy;
