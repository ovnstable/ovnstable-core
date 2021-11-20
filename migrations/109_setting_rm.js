const RewardManager = artifacts.require("./RewardManager.sol")
const Vault = artifacts.require("./Vault.sol")


let amUsdc = "0x1a13F4Ca1d028320A707D99520AbFefca3998b7F"
let curveGaugeAddress = "0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c"

module.exports = async function (deployer) {

    // get deployed contracts
    const rm = await RewardManager.deployed();
    const vault = await Vault.deployed();

    await rm.setRewardGauge(curveGaugeAddress);
    console.log("rm.setRewardGauge done");

    await rm.setVault(vault.address);
    console.log("rm.setVault done");

    await rm.setTokens(amUsdc);
    console.log("rm.setTokens done");


};
