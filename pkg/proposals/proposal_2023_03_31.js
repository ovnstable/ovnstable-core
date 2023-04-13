const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let ExchangeArb = await getContract('Exchange', 'arbitrum');

    addresses.push(ExchangeArb.address);
    values.push(0);
    abis.push(ExchangeArb.interface.encodeFunctionData('setPayoutListener', ['0x3ca375b8107cB2c7f520cA87b2DeF8dC5040aeb4']));

    let ExchangeArbDai = await getContract('Exchange', 'arbitrum_dai');

    addresses.push(ExchangeArbDai.address);
    values.push(0);
    abis.push(ExchangeArbDai.interface.encodeFunctionData('setPayoutListener', ['0x3ca375b8107cB2c7f520cA87b2DeF8dC5040aeb4']));

    await createProposal(addresses, values, abis);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

