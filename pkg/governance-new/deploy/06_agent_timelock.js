const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const hre = require("hardhat");
const {ethers} = require("hardhat");
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    const motherTimelock = '0xA4fc2F25CA4dFEc08F07eE92d3173BA21A01E9f8';
    const chainId = "10";

    let ovnAgent;
    let gateway;

    switch (hre.network.name){
        case "optimism":
            ovnAgent = '0x410FcB956B021b1ee51198F8Eb944A979C428d22';
            gateway = ZERO_ADDRESS;
            break;

        default:
            throw new Error('Unknown chain');
    }

    let params = {
        args: [gateway, motherTimelock, ovnAgent, chainId]
    }

    await deployProxy('AgentTimelock', deployments, save, params);

};

module.exports.tags = ['AgentTimelock'];
