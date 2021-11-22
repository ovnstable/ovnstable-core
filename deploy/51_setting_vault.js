
let aaveIncentivesController = "0x357D51124f59836DeD84c8a1730D72B749d8BC23"

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const vault = await ethers.getContract("Vault");
    const pm = await ethers.getContract("PortfolioManager");
    const rm = await ethers.getContract("RewardManager");

    // setup vault
    await vault.setPortfolioManager(pm.address);
    console.log("vault.setPortfolioManager done");

    await vault.setRewardManager(rm.address);
    console.log("vault.setRewardManager done");

    await vault.setAaveReward(aaveIncentivesController);
    console.log("vault.setAaveReward done");

};

module.exports.tags = ['Setting'];
