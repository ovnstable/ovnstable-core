const {ethers, upgrades} = require("hardhat");
const hre = require("hardhat");
const {getImplementationAddress} = require('@openzeppelin/upgrades-core');
const sampleModule = require('@openzeppelin/hardhat-upgrades/dist/utils/deploy-impl');
const fs = require('fs');
const {getContract, checkTimeLockBalance} = require("./script-utils");


async function deployProxy(contractName, deployments, save, params) {
    return deployProxyMulti(contractName, contractName, deployments, save, params);
}

async function deployProxyMulti(contractName, factoryName, deployments, save, params) {

    if (hre.ovn === undefined)
        hre.ovn = {};

    let factoryOptions;
    let unsafeAllow;
    let args;
    if (params) {
        factoryOptions = params.factoryOptions;
        unsafeAllow = params.unsafeAllow;
        args = params.args;
    }

    const contractFactory = await ethers.getContractFactory(factoryName, factoryOptions);

    //await upgrades.forceImport('0x5AfF5fF3b0190EC73a956b3aAFE57C3b85d35b37', contractFactory, args, {
    //    kind: 'uups',
    //    unsafeAllow: unsafeAllow
    //});

    let proxy;
    try {
        proxy = await ethers.getContract(contractName);
    } catch (e) {
    }

    if (!proxy) {
        console.log(`Proxy ${contractName} not found`)
        proxy = await upgrades.deployProxy(contractFactory, args, {
            kind: 'uups',
            unsafeAllow: unsafeAllow
        });
        console.log(`Deploy ${contractName} Proxy progress -> ` + proxy.address + " tx: " + proxy.deployTransaction.hash);
        await proxy.deployTransaction.wait();
    } else {
        console.log(`Proxy ${contractName} found -> ` + proxy.address)
    }

    let impl;
    let implAddress;
    if (hre.ovn && !hre.ovn.impl) {
        // Deploy a new implementation and upgradeProxy to new;
        // You need have permission for role UPGRADER_ROLE;

        try {
            impl = await upgrades.upgradeProxy(proxy, contractFactory, {unsafeAllow: unsafeAllow});
        } catch (e) {
            impl = await upgrades.upgradeProxy(proxy, contractFactory, {unsafeAllow: unsafeAllow});
        }
        implAddress = await getImplementationAddress(ethers.provider, proxy.address);
        console.log(`Deploy ${contractName} Impl  done -> proxy [` + proxy.address + "] impl [" + implAddress + "]");
    } else {

        //Deploy only a new implementation without call upgradeTo
        //For system with Governance
        impl = await sampleModule.deployProxyImpl(hre, contractFactory, {
            kind: 'uups',
            unsafeAllow: unsafeAllow
        }, proxy.address);

        implAddress = impl.impl;
        console.log('Deploy impl done without upgradeTo -> impl [' + implAddress + "]");
    }


    if (impl && impl.deployTransaction)
        await impl.deployTransaction.wait();

    const artifact = await deployments.getExtendedArtifact(factoryName);
    artifact.implementation = implAddress;
    let proxyDeployments = {
        address: proxy.address,
        ...artifact
    }

    await save(contractName, proxyDeployments);


    // Enable verification contract after deploy
    if (hre.ovn.verify){

        console.log(`Verify proxy [${proxy.address}] ....`);

        try {
            await hre.run("verify:verify", {
                address: proxy.address,
                constructorArguments: [args],
            });
        } catch (e) {
            console.log(e);
        }


        console.log(`Verify impl [${impl.impl}] ....`);

        await hre.run("verify:verify", {
            address: impl.impl,
            constructorArguments: [],
        });
    }

    if (hre.ovn.gov){


        let timelock = await getContract('OvnTimelockController');

        hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545')
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [timelock.address],
        });

        const timelockAccount = await hre.ethers.getSigner(timelock.address);

        await checkTimeLockBalance();

        let contract = await getContract(contractName);
        await contract.connect(timelockAccount).upgradeTo(impl.impl);

        console.log(`[Gov] upgradeTo completed `)
    }


    return proxyDeployments;
}


module.exports = {
    deployProxy: deployProxy,
    deployProxyMulti: deployProxyMulti,
};
