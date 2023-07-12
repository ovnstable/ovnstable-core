const { getContract, execTimelock } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal } = require("@overnight-contracts/common/utils/governance");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let Exchange = await getContract('Exchange', 'optimism');
    addresses.push(Exchange.address);
    values.push(0);
    abis.push(Exchange.interface.encodeFunctionData('upgradeTo', ['0xCF02Cf91b5EC8230D6bD26C48a8B762ce6081C0F']));

    let ExchangeDai = await getContract('Exchange', 'optimism_dai');
    addresses.push(ExchangeDai.address);
    values.push(0);
    abis.push(ExchangeDai.interface.encodeFunctionData('upgradeTo', ['0xCF02Cf91b5EC8230D6bD26C48a8B762ce6081C0F']));


    await createProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

