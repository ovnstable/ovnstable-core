const IAaveIncentivesController = artifacts.require("IAaveIncentivesController")
const Vault = artifacts.require("Vault")
const PortfolioManager = artifacts.require("PortfolioManager")
const ERC20 = artifacts.require("ERC20")
const RewardManager = artifacts.require("RewardManager")


module.exports = async function (callback) {
    try {
        let accounts = await web3.eth.getAccounts()
        let userAccount = accounts[0];


        console.log("userAccount: " + userAccount);
        let vault = await Vault.deployed();
        let pm = await PortfolioManager.deployed();
        let rm = await RewardManager.deployed();
        let aave = await IAaveIncentivesController.at("0x357D51124f59836DeD84c8a1730D72B749d8BC23");


        let wmatic = await ERC20.at('0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270');
        let amUSDC = await ERC20.at('0x1a13F4Ca1d028320A707D99520AbFefca3998b7F');


        console.log('Balance wmatic: ' + (await wmatic.balanceOf(vault.address)/ 10 ** 18));
        console.log('Balance amUSDC: ' + (await amUSDC.balanceOf(vault.address) / 10 ** 6));

        let assets = ['0x1a13F4Ca1d028320A707D99520AbFefca3998b7F'];
        let rewardBalance = await aave.getRewardsBalance(assets, vault.address);
        console.log('Reward balance: ' + rewardBalance.toString() / 10 ** 18);


        rewardBalance = await aave.getRewardsBalance(assets, vault.address);
        console.log('Reward balance: ' + rewardBalance.toString() / 10 ** 18);


        console.log(await rm.amUSDC.call());

        // await pm.claimRewards();
        // await rm.claimRewardAave();
        // await vault.claimRewardAave(assets);

        console.log('Balance wmatic: ' + (await wmatic.balanceOf(vault.address) / 10 ** 18));

    } catch (error) {
        console.log(error);

    }
    callback();
}

