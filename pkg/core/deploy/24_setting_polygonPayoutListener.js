const {ethers} = require("hardhat");

let {DEFAULT} = require('@overnight-contracts/common/utils/assets');

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const polygonPL = await ethers.getContract("PolygonPayoutListener");
    const exchange = await ethers.getContract("Exchange");

    await (await polygonPL.setExchanger(exchange.address)).wait();


    let pools = [
        "0x68b7cEd0dBA382a0eC705d6d97608B7bA3CD8C55", // Qs
        "0x901Debb34469e89FeCA591f5E5336984151fEc39", // Qs
        "0x91f670270b86c80ec92bb6b5914e6532ca967bfb", // Meshswap
        "0x421a018cC5839c4C0300AfB21C725776dc389B1a"  // Dystopia
    ]

    await (await polygonPL.setQsSyncPools(pools)).wait();

    console.log('PolygonPayoutListener done');

};

module.exports.tags = ['setting', 'SettingPolygonPayoutListener'];

