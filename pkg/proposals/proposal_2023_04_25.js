const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let Exchange = await getContract('Exchange', 'optimism');

    addresses.push(Exchange.address);
    values.push(0);
    abis.push(Exchange.interface.encodeFunctionData('setPayoutListener', ['0xdBaB307F2f19A678F90Ad309C8b34DaD3da8d334']));

    let ExchangeDai = await getContract('Exchange', 'optimism_dai');

    addresses.push(ExchangeDai.address);
    values.push(0);
    abis.push(ExchangeDai.interface.encodeFunctionData('setPayoutListener', ['0xdBaB307F2f19A678F90Ad309C8b34DaD3da8d334']));

    await createProposal(addresses, values, abis);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

