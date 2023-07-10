const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, execProposal, testStrategy, testProposal} = require("@overnight-contracts/common/utils/governance");
const {ARBITRUM} = require("@overnight-contracts/common/utils/assets");
const {prepareEnvironment} = require("@overnight-contracts/common/utils/tests");
const {Roles} = require("@overnight-contracts/common/utils/roles");

async function main() {

    let wombat = await getContract('StrategyWombatOvnUsdp', 'arbitrum');
    let wombatDai = await getContract('StrategyWombatOvnDaiPlus', 'arbitrum_dai');
    let magpieDai = await getContract('StrategyMagpieOvnDaiPlus', 'arbitrum_dai');
    let addresses = [];
    let values = [];
    let abis = [];

    addresses.push(wombat.address);
    values.push(0);
    abis.push(wombat.interface.encodeFunctionData('grantRole', [Roles.DEFAULT_ADMIN_ROLE, '0x5CB01385d3097b6a189d1ac8BA3364D900666445']));

    addresses.push(wombatDai.address);
    values.push(0);
    abis.push(wombatDai.interface.encodeFunctionData('grantRole', [Roles.DEFAULT_ADMIN_ROLE, '0x5CB01385d3097b6a189d1ac8BA3364D900666445']));

    addresses.push(magpieDai.address);
    values.push(0);
    abis.push(magpieDai.interface.encodeFunctionData('grantRole', [Roles.DEFAULT_ADMIN_ROLE, '0x5CB01385d3097b6a189d1ac8BA3364D900666445']));

    // await testProposal(addresses, values, abis);
    // await prepareEnvironment();
    // await testStrategy(strategy);

    await createProposal(addresses, values, abis)

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

