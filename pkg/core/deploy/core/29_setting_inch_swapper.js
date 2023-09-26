const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const hre = require("hardhat");
const {BASE} = require("@overnight-contracts/common/utils/assets");
const {ethers} = require("hardhat");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    let inchRouter;
    if (hre.network.name === "base") {
        inchRouter = BASE.inchRouterV5;
    }

    let inchSwapper = await ethers.getContract('InchSwapper');
    await (await inchSwapper.setRouter(inchRouter)).wait();

    console.log('InchSwapper setting done()');
};

module.exports.tags = ['InchSwapperSetting'];
