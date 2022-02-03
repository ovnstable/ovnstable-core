const { ethers } = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const balancer = await ethers.getContract('Balancer');

    let builders = [];
    builders.push('Usdc2VimUsdActionBuilder');
    builders.push('Usdc2IdleUsdcActionBuilder');
    builders.push('Usdc2BpspTUsdActionBuilder');
    builders.push('Usdc2AUsdcActionBuilder');
    builders.push('A3Crv2A3CrvGaugeActionBuilder');
    builders.push('AUsdc2A3CrvActionBuilder');
    builders.push('WMatic2UsdcActionBuilder');
    builders.push('Crv2UsdcActionBuilder');
    builders.push('Mta2UsdcActionBuilder');
    builders.push('TUsd2UsdcActionBuilder');
    builders.push('Bal2UsdcActionBuilder');


    for (let i = 0; i <builders.length ; i++) {

        let builder = builders[i];
        let contract = await ethers.getContract(builder);
        let tx = await balancer.addActionBuilderAt(contract.address, i);
        await tx.wait();
        console.log(`Builder ${builder} done`);
    }

};

module.exports.tags = ['setting', 'setting-action-builders'];
