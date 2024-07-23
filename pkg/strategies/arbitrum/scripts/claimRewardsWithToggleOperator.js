const { getContract, showM2M, execTimelock, getERC20ByAddress, initWallet } = require('@overnight-contracts/common/utils/script-utils');
const { testProposal, createProposal } = require('@overnight-contracts/common/utils/governance');
const { fromE18, toE6, toE18, fromE6, fromAsset } = require('@overnight-contracts/common/utils/decimals');
const { ARBITRUM } = require('@overnight-contracts/common/utils/assets');
const { Roles } = require('@overnight-contracts/common/utils/roles');
const { prepareEnvironment } = require('@overnight-contracts/common/utils/tests');
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');
const { ethers } = require('hardhat');

async function main() {
    let strategy = await getContract('StrategySiloUsdc', 'localhost');

    await execTimelock(async timelock => {
        await strategy.connect(timelock).claimRewardsWithToggleOperator(timelock.address);
    });
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
