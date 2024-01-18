const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { ARBITRUM } = require("@overnight-contracts/common/utils/assets");
const { ethers } = require("hardhat");
const { Roles } = require("@overnight-contracts/common/utils/roles");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deployProxy('Pancake8020Zap', deployments, save);
    console.log("Pancake8020Zap deploy done()");

    let params = {
        odosRouter: ARBITRUM.odosRouterV2,
        npm: ARBITRUM.pancakeNpm
    }

    let zap = await ethers.getContract('Pancake8020Zap');

    await (await zap.setParams(params)).wait();
    console.log('Pancake8020Zap setParams done()');
};

module.exports.tags = ['Pancake8020Zap'];
