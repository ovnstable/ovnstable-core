const {ethers} = require("hardhat");

let {DEFAULT} = require('@overnight-contracts/common/utils/assets');

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const polygonPL = await ethers.getContract("PolygonPayoutListener");
    const exchange = await ethers.getContract("Exchange");

    await (await polygonPL.setExchanger(exchange.address)).wait();

};

module.exports.tags = ['setting', 'SettingPolygonPayoutListener'];

