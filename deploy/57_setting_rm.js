const { ethers } = require("hardhat");

const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

let curveGaugeAddress = "0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c";
let merkleOrchard = "0x0F3e0c4218b7b0108a3643cFe9D3ec0d4F57c54e";

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const rm = await ethers.getContract("RewardManager");
    const vault = await ethers.getContract("Vault");

    console.log("rm.setRewardGauge: " + curveGaugeAddress);
    let tx = await rm.setRewardGauge(curveGaugeAddress);
    await tx.wait();
    console.log("rm.setRewardGauge done");

    console.log("rm.setVault: " + vault.address);
    tx = await rm.setVault(vault.address);
    await tx.wait();
    console.log("rm.setVault done");

    console.log("rm.setAUsdcToken: " + assets.amUsdc);
    tx = await rm.setAUsdcToken(assets.amUsdc);
    await tx.wait();
    console.log("rm.setAUsdcToken done");

    console.log("rm.setMerkleOrchard: " + merkleOrchard);
    tx = await rm.setMerkleOrchard(merkleOrchard);
    await tx.wait();
    console.log("rm.setMerkleOrchard done");

};

module.exports.tags = ['setting','SettingRewardManager'];
