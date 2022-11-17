const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");

async function main(){

    let exchange = await getContract('Exchange');

    let addresses = [];
    let values = [];
    let abis = [];

    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('grantRole', [await exchange.FREE_RIDER_ROLE(), '0x307418340F5991CD895CA0Fc4Eba04995e9BE861']))

    await createProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

