const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");
const {DEFAULT} = require("@overnight-contracts/common/utils/assets");

module.exports = async ({deployments}) => {
    const {save} = deployments;
    const analyticsPlatform = await ethers.getContract("AnalyticsPlatform");

    await (await analyticsPlatform.setUsdc(DEFAULT.usdc)).wait();

    console.log('AnalyticsPlatformSetting done')

};

module.exports.tags = ['AnalyticsPlatformSetting'];
