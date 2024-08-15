const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const hre = require("hardhat");
const {  getAsset} = require("@overnight-contracts/common/utils/assets");
const { ethers } = require("hardhat");
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    let inchRouter = getAsset('inchRouterV5');
    let blockGetter = ZERO_ADDRESS;

    if (hre.network.name.toLowerCase() == "arbitrum") {
        blockGetter = "0xE3c6B98B77BB5aC53242c4B51c566e95703538F7"
    }

    let inchSwapper = await ethers.getContract('InchSwapper');
    let roleManager = await getContract('RoleManager');
    await (await inchSwapper.setParams(inchRouter, blockGetter, roleManager.address)).wait();
    console.log('InchSwapper setting done()');
};

module.exports.tags = ['InchSwapperSetting'];
