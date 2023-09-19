const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const hre = require("hardhat");
const {ethers} = require("hardhat");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    let params = [{
        args: []
    }]

    await deployProxy('AgentTimelock', deployments, save, params);


};

module.exports.tags = ['AgentTimelock'];
