const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, execProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let exchange = await getContract('Exchange');

    let addresses = [];
    let values = [];
    let abis = [];

    let PORTFOLIO_AGENT_ROLE = '0xd67ad422505496469a1adf6cdf9e5ee92ac5d33992843c9ecc4b2f6d6cde9137'

    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('upgradeTo', ['0xceD883Db0FAa589Ac68fc457822277b582a9DCDf']));

    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('changeAdminRoles', []));

    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('grantRole', [PORTFOLIO_AGENT_ROLE, '0x0bE3f37201699F00C21dCba18861ed4F60288E1D']));

    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('grantRole', [PORTFOLIO_AGENT_ROLE, '0xe497285e466227F4E8648209E34B465dAA1F90a0']));

    await createProposal(addresses, values, abis)

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

