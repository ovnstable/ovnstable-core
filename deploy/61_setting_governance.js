const { ethers } = require("hardhat");

const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const token = await ethers.getContract("GovToken");

    let votes = ethers.utils.parseUnits("100.0", 18);
    let tx = await token.mint(deployer, votes);
    await tx.wait();
    console.log('Mint 100 ovn token to ' + deployer + " done")
};

module.exports.tags = ['setting','Setting'];

