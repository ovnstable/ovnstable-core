const Exchange = artifacts.require("Exchange");
const PortfolioManager = artifacts.require("./PortfolioManager.sol")
const Vault = artifacts.require("./Vault.sol")
const Balancer = artifacts.require("./Balancer.sol")
const RewardManager = artifacts.require("./RewardManager.sol")



module.exports = async function (deployer) {

    // get deployed contracts
    const exchange = await Exchange.deployed();
    const vault = await Vault.deployed();
    const balancer = await Balancer.deployed();
    const pm = await PortfolioManager.deployed();
    const rm = await RewardManager.deployed();

    // setup pm
    await pm.setVault(vault.address);
    console.log("pm.setVault done");

    await pm.setBalancer(balancer.address);
    console.log("pm.setBalancer done");

    await pm.setExchanger(exchange.address);
    console.log("pm.setExchanger done");

    await pm.setRewardManager(rm.address);
    console.log("pm.setRewardManager done");
};
