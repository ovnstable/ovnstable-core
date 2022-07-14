const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let exchange = await getContract('Exchange');

    let addresses = [];
    let values = [];
    let abis = [];


    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('upgradeTo', ['0x98Db3ff85F35353B9282613c105fF274DFBD2812']));

    await createProposal(addresses, values, abis);

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

