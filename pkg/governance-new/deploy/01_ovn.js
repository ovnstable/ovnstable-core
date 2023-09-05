const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const hre = require("hardhat");

module.exports = async ({deployments}) => {
    const {save} = deployments;
    await deployProxy('Ovn', deployments, save);


    let interchainTokenService;
    switch (hre.network.name){
        case "base":
            interchainTokenService = "";
            break;
        default:
            throw new Error('Please add support chain');

    }
};

module.exports.tags = ['Ovn'];
