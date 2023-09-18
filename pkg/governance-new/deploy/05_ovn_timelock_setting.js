const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const hre = require("hardhat");
const {ethers} = require("hardhat");
const {Roles} = require("@overnight-contracts/common/utils/roles");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    let timelock = await ethers.getContract('OvnTimelock');
    let governor = await ethers.getContract('OvnGovernor');

    await timelock.grantRole(await timelock.PROPOSER_ROLE(), governor.address);
    await timelock.grantRole(await timelock.EXECUTOR_ROLE(), governor.address);
    await timelock.grantRole(await timelock.CANCELLER_ROLE(), governor.address);

    console.log('timelock.grantRole(PROPOSER,EXECUTE,CANCELLER) to governor');
};

module.exports.tags = ['OvnTimelockSetting'];
