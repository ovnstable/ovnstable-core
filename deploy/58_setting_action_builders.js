const { ethers } = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const balancer = await ethers.getContract('Balancer');

    // set actions builders in order
    const usdc2VimUsdActionBuilder = await ethers.getContract('Usdc2VimUsdActionBuilder');
    console.log("usdc2VimUsdActionBuilder");
    let tx = await balancer.addActionBuilderAt(usdc2VimUsdActionBuilder.address, 0);
    await tx.wait();
    console.log("usdc2VimUsdActionBuilder added");

    const usdc2IdleUsdcActionBuilder = await ethers.getContract('Usdc2IdleUsdcActionBuilder');
    console.log("usdc2IdleUsdcActionBuilder");
    tx = await balancer.addActionBuilderAt(usdc2IdleUsdcActionBuilder.address, 1);
    await tx.wait();
    console.log("usdc2IdleUsdcActionBuilder added");

    const usdc2BpspTUsdActionBuilder = await ethers.getContract('Usdc2BpspTUsdActionBuilder');
    console.log("usdc2BpspTUsdActionBuilder");
    tx = await balancer.addActionBuilderAt(usdc2BpspTUsdActionBuilder.address, 2);
    await tx.wait();
    console.log("usdc2BpspTUsdActionBuilder added");

    const usdc2AUsdcActionBuilder = await ethers.getContract('Usdc2AUsdcActionBuilder');
    console.log("usdc2AUsdcActionBuilder");
    tx = await balancer.addActionBuilderAt(usdc2AUsdcActionBuilder.address, 3);
    await tx.wait();
    console.log("usdc2AUsdcActionBuilder added");

    const a3Crv2A3CrvGaugeActionBuilder = await ethers.getContract('A3Crv2A3CrvGaugeActionBuilder');
    console.log("a3Crv2A3CrvGaugeActionBuilder");
    tx = await balancer.addActionBuilderAt(a3Crv2A3CrvGaugeActionBuilder.address, 4);
    await tx.wait();
    console.log("a3Crv2A3CrvGaugeActionBuilder added");

    const aUsdc2A3CrvActionBuilder = await ethers.getContract('AUsdc2A3CrvActionBuilder');
    console.log("aUsdc2A3CrvActionBuilder");
    tx = await balancer.addActionBuilderAt(aUsdc2A3CrvActionBuilder.address, 5);
    await tx.wait();
    console.log("aUsdc2A3CrvActionBuilder added");

    const wMatic2UsdcActionBuilder = await ethers.getContract('WMatic2UsdcActionBuilder');
    console.log("wMatic2UsdcActionBuilder");
    tx = await balancer.addActionBuilderAt(wMatic2UsdcActionBuilder.address, 6);
    await tx.wait();
    console.log("wMatic2UsdcActionBuilder added");

    const crv2UsdcActionBuilder = await ethers.getContract('Crv2UsdcActionBuilder');
    console.log("crv2UsdcActionBuilder");
    tx = await balancer.addActionBuilderAt(crv2UsdcActionBuilder.address, 7);
    await tx.wait();
    console.log("crv2UsdcActionBuilder added");

    const mta2UsdcActionBuilder = await ethers.getContract('Mta2UsdcActionBuilder');
    console.log("mta2UsdcActionBuilder");
    tx = await balancer.addActionBuilderAt(mta2UsdcActionBuilder.address, 8);
    await tx.wait();
    console.log("mta2UsdcActionBuilder added");

    const tUsd2UsdcActionBuilder = await ethers.getContract('TUsd2UsdcActionBuilder');
    console.log("tUsd2UsdcActionBuilder");
    tx = await balancer.addActionBuilderAt(tUsd2UsdcActionBuilder.address, 9);
    await tx.wait();
    console.log("tUsd2UsdcActionBuilder added");

    const bal2UsdcActionBuilder = await ethers.getContract('Bal2UsdcActionBuilder');
    console.log("bal2UsdcActionBuilder");
    tx = await balancer.addActionBuilderAt(bal2UsdcActionBuilder.address, 10);
    await tx.wait();
    console.log("bal2UsdcActionBuilder added");
};

module.exports.tags = ['setting', 'Setting'];
