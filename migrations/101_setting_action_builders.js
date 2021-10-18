const Balancer = artifacts.require("./Balancer.sol")

const Usdc2AUsdcActionBuilder = artifacts.require("./action_builders/Usdc2AUsdcActionBuilder.sol")
const AUsdc2A3CrvActionBuilder = artifacts.require("./action_builders/AUsdc2A3CrvActionBuilder.sol")
const A3Crv2A3CrvGaugeActionBuilder = artifacts.require("./action_builders/A3Crv2A3CrvGaugeActionBuilder.sol")
const WMatic2UsdcActionBuilder = artifacts.require("./action_builders/WMatic2UsdcActionBuilder.sol")
const Crv2UsdcActionBuilder = artifacts.require("./action_builders/Crv2UsdcActionBuilder.sol")


module.exports = async function (deployer) {
    const balancer = await Balancer.deployed();

    // set actions builders in order
    const usdc2AUsdcActionBuilder = await Usdc2AUsdcActionBuilder.deployed();
    console.log("usdc2AUsdcActionBuilder");
    await balancer.addActionBuilderAt(usdc2AUsdcActionBuilder.address, 0);
    console.log("usdc2AUsdcActionBuilder added");
 
    const a3Crv2A3CrvGaugeActionBuilder = await A3Crv2A3CrvGaugeActionBuilder.deployed();
    console.log("a3Crv2A3CrvGaugeActionBuilder");
    await balancer.addActionBuilderAt(a3Crv2A3CrvGaugeActionBuilder.address, 1);
    console.log("a3Crv2A3CrvGaugeActionBuilder added");

    const aUsdc2A3CrvActionBuilder = await AUsdc2A3CrvActionBuilder.deployed();
    console.log("aUsdc2A3CrvActionBuilder");
    await balancer.addActionBuilderAt(aUsdc2A3CrvActionBuilder.address, 2);
    console.log("aUsdc2A3CrvActionBuilder added");
 
    const wMatic2UsdcActionBuilder = await WMatic2UsdcActionBuilder.deployed();
    console.log("wMatic2UsdcActionBuilder");
    await balancer.addActionBuilderAt(wMatic2UsdcActionBuilder.address, 3);
    console.log("wMatic2UsdcActionBuilder added");
 
    const crv2UsdcActionBuilder = await Crv2UsdcActionBuilder.deployed();
    console.log("crv2UsdcActionBuilder");
    await balancer.addActionBuilderAt(crv2UsdcActionBuilder.address, 4);
    console.log("crv2UsdcActionBuilder added");
 
};
