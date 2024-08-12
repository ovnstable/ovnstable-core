const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { BASE } = require("@overnight-contracts/common/utils/assets");
const { ethers } = require("hardhat");
const { Roles } = require("@overnight-contracts/common/utils/roles");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deployProxy('PoolAggregator', deployments, save);
    console.log("PoolAggregator deploy done()");

    // let aggregator = await ethers.getContract('PoolAggregator');
    //
    // await (await aggregator.grantRole(Roles.UNIT_ROLE, "0xab918d486c61ADd7c577F1af938117bBD422f088")).wait();
    // await (await aggregator.addProtocol("0xb63F93A8020d0495fE9EDfE23Da3b7833F632c49")).wait();
    // console.log('PoolAggregator addProtocol done()');
};

module.exports.tags = ['PoolAggregator'];
