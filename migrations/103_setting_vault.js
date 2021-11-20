const PortfolioManager = artifacts.require("./PortfolioManager.sol")
const Vault = artifacts.require("./Vault.sol")
const RewardManager = artifacts.require("./RewardManager.sol")

let aaveIncentivesController = "0x357D51124f59836DeD84c8a1730D72B749d8BC23"

module.exports = async function (deployer) {

    // get deployed contracts
    const vault = await Vault.deployed();
    const pm = await PortfolioManager.deployed();
    const rm = await RewardManager.deployed();

    // setup vault
    await vault.setPortfolioManager(pm.address);
    console.log("vault.setPortfolioManager done");

    await vault.setRewardManager(rm.address);
    console.log("vault.setRewardManager done");

    await vault.setAaveReward(aaveIncentivesController);
    console.log("vault.setAaveReward done");


};
