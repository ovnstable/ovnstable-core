const {ethers, upgrades} = require("hardhat");
const hre = require("hardhat");
const {getImplementationAddress} = require('@openzeppelin/upgrades-core');
const sampleModule = require('@openzeppelin/hardhat-upgrades/dist/utils/deploy-impl');
const fs = require('fs');

async function deployProxy(contractName, deployments, save) {

    const contractFactory = await ethers.getContractFactory(contractName);

    let proxy;
    try {
        proxy = await ethers.getContract(contractName);
    } catch (e) {
    }

    if (!proxy) {
        console.log(`Proxy ${contractName} not found`)
        proxy = await upgrades.deployProxy(contractFactory, {kind: 'uups'});
        console.log(`Deploy ${contractName} Proxy progress -> ` + proxy.address + " tx: " + proxy.deployTransaction.hash);
        await proxy.deployTransaction.wait();
    } else {
        console.log(`Proxy ${contractName} found -> ` + proxy.address)
    }


    let upgradeTo = true;
    let impl;
    if (upgradeTo) {
        // Deploy a new implementation and upgradeProxy to new;
        // You need have permission for role UPGRADER_ROLE;

        try {
            impl = await upgrades.upgradeProxy(proxy, contractFactory);
        } catch (e) {
            impl = await upgrades.upgradeProxy(proxy, contractFactory);
        }
        const currentImplAddress = await getImplementationAddress(ethers.provider, proxy.address);
        console.log(`Deploy ${contractName} Impl  done -> proxy [` + proxy.address + "] impl [" + currentImplAddress + "]");
    } else {

        //Deploy only a new implementation without call upgradeTo
        //For system with Governance
        impl = await sampleModule.deployImpl(hre, contractFactory, {kind: 'uups'}, proxy.address);
        console.log('Deploy impl done without upgradeTo -> impl [' + impl.impl + "]");

        let name = 'impls_' + new Date().getDay() + ".json";
        let config;
        try {
            config = JSON.parse(fs.readFileSync(name, 'utf8'));
        } catch (e) {
            config = [];
        }
        config.push({
            contractName: contractName,
            address: impl.impl
        });

        await fs.writeFile(name, JSON.stringify(config), 'utf8', ()=>{});
    }


    if (impl && impl.deployTransaction)
        await impl.deployTransaction.wait();

    const artifact = await deployments.getExtendedArtifact(contractName);
    let proxyDeployments = {
        address: proxy.address,
        ...artifact
    }

    await save(contractName, proxyDeployments);
    return proxyDeployments;
}


module.exports = deployProxy;
