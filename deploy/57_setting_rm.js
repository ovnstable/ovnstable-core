const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

let curveGaugeAddress = "0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c"

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const rm = await ethers.getContract("RewardManager");
    const vault = await ethers.getContract("Vault");

    await rm.setRewardGauge(curveGaugeAddress);
    console.log("rm.setRewardGauge done");

    await rm.setVault(vault.address);
    console.log("rm.setVault done");

    await rm.setTokens(assets.amUsdc);
    console.log("rm.setTokens done");

};

module.exports.tags = ['SettingRewardManager'];
