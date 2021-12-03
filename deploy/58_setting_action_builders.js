module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const balancer = await  ethers.getContract('Balancer');

    // set actions builders in order
    const usdc2IdleUsdcActionBuilder = await ethers.getContract('Usdc2IdleUsdcActionBuilder');
    console.log("usdc2IdleUsdcActionBuilder");
    await balancer.addActionBuilderAt(usdc2IdleUsdcActionBuilder.address, 0);
    console.log("usdc2IdleUsdcActionBuilder added");

    const usdc2AUsdcActionBuilder = await ethers.getContract('Usdc2AUsdcActionBuilder');
    console.log("usdc2AUsdcActionBuilder");
    await balancer.addActionBuilderAt(usdc2AUsdcActionBuilder.address, 0);
    console.log("usdc2AUsdcActionBuilder added");

    const a3Crv2A3CrvGaugeActionBuilder = await ethers.getContract('A3Crv2A3CrvGaugeActionBuilder');
    console.log("a3Crv2A3CrvGaugeActionBuilder");
    await balancer.addActionBuilderAt(a3Crv2A3CrvGaugeActionBuilder.address, 1);
    console.log("a3Crv2A3CrvGaugeActionBuilder added");

    const aUsdc2A3CrvActionBuilder = await ethers.getContract('AUsdc2A3CrvActionBuilder');
    console.log("aUsdc2A3CrvActionBuilder");
    await balancer.addActionBuilderAt(aUsdc2A3CrvActionBuilder.address, 2);
    console.log("aUsdc2A3CrvActionBuilder added");

    const wMatic2UsdcActionBuilder = await ethers.getContract('WMatic2UsdcActionBuilder');
    console.log("wMatic2UsdcActionBuilder");
    await balancer.addActionBuilderAt(wMatic2UsdcActionBuilder.address, 3);
    console.log("wMatic2UsdcActionBuilder added");

    const crv2UsdcActionBuilder = await ethers.getContract('Crv2UsdcActionBuilder');
    console.log("crv2UsdcActionBuilder");
    await balancer.addActionBuilderAt(crv2UsdcActionBuilder.address, 4);
    console.log("crv2UsdcActionBuilder added");

};

module.exports.tags = ['setting', 'Setting'];
