const {getContract, execTimelock, showHedgeM2M} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let exchange = await getContract('HedgeExchangerUsdPlusWmatic');

    let addresses = [];
    let values = [];
    let abis = [];

    await execTimelock(async (timelock) => {

        await showHedgeM2M();
        await exchange.connect(timelock).setAbroad(0);
        await (await exchange.payout()).wait();
        await showHedgeM2M();
    });


    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('setAbroad', [0]));

    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('payout', []));

    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('setAbroad', [await exchange.abroadMin()]));

    await createProposal(addresses, values, abis);

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

