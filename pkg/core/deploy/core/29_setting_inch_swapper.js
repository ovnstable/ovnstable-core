const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const hre = require("hardhat");
const {  getAsset} = require("@overnight-contracts/common/utils/assets");
const { ethers } = require("hardhat");
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");
const { Roles } = require("@overnight-contracts/common/utils/roles");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    let inchRouter = getAsset('inchRouterV5');
    let blockGetter = ZERO_ADDRESS;

    if (hre.network.name.toLowerCase() == "arbitrum") {
        blockGetter = "0xE3c6B98B77BB5aC53242c4B51c566e95703538F7"
    }

    let inchSwapper = await ethers.getContract('InchSwapper');
    await (await inchSwapper.setParams(inchRouter, blockGetter)).wait();
    await (await inchSwapper.grantRole(Roles.UNIT_ROLE, "0x5CB01385d3097b6a189d1ac8BA3364D900666445")).wait();
    await (await inchSwapper.grantRole(Roles.UNIT_ROLE, "0xb8f55cdd8330b9bf9822137Bc8A6cCB89bc0f055")).wait();
    await (await inchSwapper.grantRole(Roles.UNIT_ROLE, "0xBDe60382Ab7AD8548c5087286E17F2577C726F11")).wait();
    await (await inchSwapper.grantRole(Roles.DEFAULT_ADMIN_ROLE, '0x5CB01385d3097b6a189d1ac8BA3364D900666445')).wait();
    console.log('InchSwapper setting done()');
};

module.exports.tags = ['InchSwapperSetting'];
