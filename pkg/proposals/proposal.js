const hre = require("hardhat");
const {getContract, showM2M, execTimelock, initWallet, convertWeights} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal, testUsdPlus, testStrategy} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let exchange = await getContract('Exchange', 'optimism');
    let timelock =  await getContract('AgentTimelock', 'optimism');

    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('grantRole', [Roles.DEFAULT_ADMIN_ROLE, '0x5CB01385d3097b6a189d1ac8BA3364D900666445']));

    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('revokeRole', [Roles.DEFAULT_ADMIN_ROLE, timelock.address]));

    await createProposal('4_move_exchange_to_dev.js', addresses, values, abis);

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

