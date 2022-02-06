const { ethers } = require("hardhat");

const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

let aCurvepoolStake = "0x445FE580eF8d70FF569aB36e80c647af338db351";
let aaveAddress = "0xd05e3E715d945B59290df0ae8eF85c1BdB684744";


module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const strategy = await ethers.getContract("StrategyAave");
    const vault = await ethers.getContract("Vault");
    await (await strategy.setParams(aaveAddress, assets.usdc, assets.amUsdc, vault.address)).wait();
    console.log('StrategyAave setting done')
};

module.exports.tags = ['setting','StrategyAaveSetting'];

