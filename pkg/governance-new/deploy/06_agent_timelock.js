const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const hre = require("hardhat");
const {ethers} = require("hardhat");
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    let motherTimelock = '0xA4fc2F25CA4dFEc08F07eE92d3173BA21A01E9f8';
    let motherChainId = "optimism";

    let ovnAgent;
    let gateway;
    switch (hre.network.name){
        case "optimism":
            ovnAgent = '0xD439BD5Fb6fAbB2244C46f03559485c3C33e0521';
            gateway = ZERO_ADDRESS;
            break;
        case "arbitrum":
            ovnAgent = "0x5cBb2167677c2259F421457542f6E5A805B1FF2F";
            gateway = "0xe432150cce91c13a887f7D836923d5597adD8E31";
            break
        case "base":
            ovnAgent = "0xAba227eAd919E060B95B02bab2270646840bF9bC";
            gateway = "0xe432150cce91c13a887f7D836923d5597adD8E31";
            break
        case "bsc":
            ovnAgent = "0xdFdB46Af574Fa0EE183841f78554F7F07940065B";
            gateway = "0x304acf330bbE08d1e512eefaa92F6a57871fD895";
            break;
        case "linea":
            ovnAgent = "0x05A69d7Ac6aA5d1D8119c56c544f47A0984f2216";
            gateway = "0xe432150cce91c13a887f7D836923d5597adD8E31";
            break;
        case "zksync":
            ovnAgent = "0x547cBF9f8A07a9E7e09f3baa2f462458a5A8268C";
            gateway = ZERO_ADDRESS;
            // Axelar not support ZkSync , but will.
            // Set MotherTimelock as OvnAgent for upgradable in future
            motherTimelock = ovnAgent;
            motherChainId = "zksync"
            break
        case "polygon":
            ovnAgent = "0xe5d15506088f96252e0c8c80bF5Cf7E3b4121B33";
            gateway = "0x6f015F16De9fC8791b234eF68D486d2bF203FBA8";
            break
        default:
            throw new Error('Unknown chain');
    }

    let params = {
        args: [gateway, motherTimelock, ovnAgent, motherChainId]
    }

    await deployProxy('AgentTimelock', deployments, save, params);

};

module.exports.tags = ['AgentTimelock'];
