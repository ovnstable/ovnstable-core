const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const hre = require("hardhat");
const {ethers} = require("hardhat");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {initWallet} = require("@overnight-contracts/common/utils/script-utils");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    let timelock = await ethers.getContract('OvnTimelock');
    let governor = await ethers.getContract('OvnGovernor');
    let wallet = await initWallet();

    await timelock.grantRole(await timelock.PROPOSER_ROLE(), governor.address);
    await timelock.grantRole(await timelock.EXECUTOR_ROLE(), governor.address);
    await timelock.grantRole(await timelock.CANCELLER_ROLE(), governor.address);

    console.log('timelock.grantRole(PROPOSER,EXECUTE,CANCELLER) to governor');

    await (await timelock.revokeRole(Roles.DEFAULT_ADMIN_ROLE, wallet.address)).wait();
    console.log('timelock.revokeRole(DEFAULT_ADMIN_ROLE) from dev wallet');
};

module.exports.tags = ['OvnTimelockSetting'];
