const { ethers, upgrades } = require('hardhat');
const hre = require('hardhat');
const { getImplementationAddress } = require('@openzeppelin/upgrades-core');
const sampleModule = require('@openzeppelin/hardhat-upgrades/dist/utils/deploy-impl');
const { getContract, checkTimeLockBalance, initWallet, sleep, getPrice } = require('./script-utils');
const { Deployer } = require('@matterlabs/hardhat-zksync-deploy');
const { isZkSync } = require('./network');

async function deployProxy(contractName, deployments, save, params) {
    if (isZkSync()) {
        params = params ? params : {};

        return deployProxyZkSync(contractName, contractName, deployments, save, params);
    } else {
        return deployProxyEth(contractName, contractName, deployments, save, params);
    }
}

async function deployProxyMulti(contractName, factoryName, deployments, save, params) {
    if (isZkSync()) {
        params = params ? params : {};

        return deployProxyZkSync(contractName, factoryName, deployments, save, params);
    } else {
        return deployProxyEth(contractName, factoryName, deployments, save, params);
    }
}

/**
 * Chain ZkSync not support by OpenZeppelin plugin for deploy proxy contracts.
 * That's why it must deploy by self.
 * How to deploy?
 * - Deploy ERC1967Proxy contract
 * - Deploy Implementation contract
 * - Execute on ERC1967Proxy function: upgradeTo(pass Implementation contract address)
 *
 * This is the implementation support next cases:
 * 1) primary deploy (proxy not exist)
 * 2) update existed proxy
 *
 * !!!! Important
 * This method not make verify storage current implementation and deploying implementation
 * YOU MUST BE SURE OF CORRECTNESS STORAGE_LAYOUT
 */

async function deployProxyZkSync(contractName, factoryName, deployments, save, params) {
    if (hre.ovn === undefined) hre.ovn = {};

    const deployer = new Deployer(hre, await initWallet());

    let proxyExist = true;

    let proxy;
    try {
        proxy = await ethers.getContract(contractName);
    } catch (e) {
        console.log(`${contractName}: Proxy not found: ` + e);
        proxyExist = false;
    }

    if (proxyExist) {
        console.log(`${contractName}: Proxy found at` + proxy.address);

        let implArtifact = await deployer.loadArtifact(factoryName);

        const implContract = await deployer.deploy(implArtifact, []);
        console.log(`${contractName}: New implementation deployed at ${implContract.address}`);

        let wallet = await initWallet();
        proxy = proxy.connect(wallet);
        // let price = await getPrice();
        // Execute this method can be not working when test it on local node

        if (!hre.ovn.impl) {
            await (await proxy.upgradeTo(implContract.address)).wait();
            console.log(`${contractName}: Proxy ${proxy.address} upgradeTo ${implContract.address}`);
        }

        await save(contractName, {
            address: proxy.address,
            implementation: implContract.address,
            ...implArtifact,
        });

        console.log(`${contractName}: Update deployments`);
    } else {
        let implArtifact = await deployer.loadArtifact(factoryName);

        const implContract = await deployer.deploy(implArtifact, []);
        console.log(`${contractName} deployed at ${implContract.address}`);

        await sleep(30000);

        let proxyArtifact = await deployer.loadArtifact('ERC1967Proxy');

        let initializeData = implContract.interface.getFunction('initialize');
        let implAddress = implContract.address;

        let args = params.args ? params.args : [];
        let implData = implContract.interface.encodeFunctionData(initializeData, args);

        const proxy = await deployer.deploy(proxyArtifact, [implAddress, implData]);

        console.log(`Proxy ${contractName} deployed at ${proxy.address}`);

        await save(contractName, {
            address: proxy.address,
            implementation: implAddress,
            ...implArtifact,
        });

        console.log(`Save ${implArtifact.contractName} to deployments`);
    }
}

async function deployProxyEth(contractName, factoryName, deployments, save, params) {
    if (hre.ovn === undefined) hre.ovn = {};

    let factoryOptions;
    let unsafeAllow;
    let args;
    if (params) {
        factoryOptions = params.factoryOptions;
        unsafeAllow = params.unsafeAllow;
        args = params.args;
    }

    const contractFactory = await ethers.getContractFactory(factoryName, factoryOptions);

    // uncomment for force import
    //    let proxyAddress = '';
    //    await upgrades.forceImport(proxyAddress, contractFactory, {
    //        kind: 'uups',
    //    });

    let proxy;
    try {
        proxy = await getContract(contractName);
    } catch (e) {}

    if (!proxy) {
        console.log(`Proxy ${contractName} not found`);
        proxy = await upgrades.deployProxy(contractFactory, args, {
            kind: 'uups',
            unsafeAllow: unsafeAllow,
        });
        console.log(`Deploy ${contractName} Proxy progress -> ` + proxy.address + ' tx: ' + proxy.deployTransaction.hash);
        await proxy.deployTransaction.wait();
    } else {
        console.log(`Proxy ${contractName} found -> ` + proxy.address);
    }

    let impl;
    let implAddress;
    if (hre.ovn && !hre.ovn.impl) {
        // Deploy a new implementation and upgradeProxy to new;
        // You need have permission for role UPGRADER_ROLE;

        try {
            impl = await upgrades.upgradeProxy(proxy, contractFactory, { unsafeAllow: unsafeAllow });
        } catch (e) {
            console.log(e);
            impl = await upgrades.forceImport(proxy, contractFactory, { unsafeAllow: unsafeAllow });
        }
        implAddress = await getImplementationAddress(ethers.provider, proxy.address);
        console.log(`Deploy ${contractName} Impl  done -> proxy [` + proxy.address + '] impl [' + implAddress + ']');
    } else {
        //Deploy only a new implementation without call upgradeTo
        //For system with Governance
        console.log('Try to deploy impl ...');

        // impl = await upgrades.forceImport(proxy, contractFactory, { unsafeAllow: unsafeAllow });
        impl = await sampleModule.deployProxyImpl(
            hre,
            contractFactory,
            {
                kind: 'uups',
                unsafeAllow: unsafeAllow,
                // redeployImplementation: "always"
                // unsafeSkipStorageCheck: true,
                // unsafeAllowRenames: true
            },
            proxy.address,
        );

        implAddress = impl.impl;
        console.log('Deploy impl done without upgradeTo -> impl [' + implAddress + ']');
    }

    if (impl && impl.deployTransaction) await impl.deployTransaction.wait();

    const artifact = await deployments.getExtendedArtifact(factoryName);
    artifact.implementation = implAddress;
    let proxyDeployments = {
        address: proxy.address,
        ...artifact,
    };

    await save(contractName, proxyDeployments);

    // Enable verification contract after deploy
    if (hre.ovn.verify) {
        console.log(`Verify proxy [${proxy.address}] ....`);

        try {
            await hre.run('verify:verify', {
                address: proxy.address,
                constructorArguments: args,
            });
        } catch (e) {
            console.log(e);
        }

        console.log(`Verify impl [${implAddress}] ....`);

        await hre.run('verify:verify', {
            address: implAddress,
            constructorArguments: [],
        });
    }

    if (hre.ovn.gov) {
        let timelock = await getContract('AgentTimelock');
        // if (isZkSync()) {
        //     hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8011')
        // } else {
        hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545');
        // }
        await hre.network.provider.request({
            method: 'hardhat_impersonateAccount',
            params: [timelock.address],
        });

        const timelockAccount = await hre.ethers.getSigner(timelock.address);

        await checkTimeLockBalance();

        let contract = await getContract(contractName);
        await contract.connect(timelockAccount).upgradeTo(impl.impl);

        console.log(`[Gov] upgradeTo completed `);
    }

    return proxyDeployments;
}

module.exports = {
    deployProxy: deployProxy,
    deployProxyMulti: deployProxyMulti,
};
