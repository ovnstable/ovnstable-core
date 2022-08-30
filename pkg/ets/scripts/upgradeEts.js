const {getContract, initWallet, getPrice, showHedgeM2M} = require("@overnight-contracts/common/utils/script-utils");
const {toUSDC} = require("@overnight-contracts/common/utils/decimals");
const {createProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let strategy = await getContract('StrategyUsdPlusWbnb');


    let addresses = [];
    let values = [];
    let abis = [];

    addresses.push(strategy.address);
    values.push(0);
    abis.push(strategy.interface.encodeFunctionData('upgradeTo', ['0x3a010fF03ceB58e5526B557cFD185593577B437b']));


    await createProposal(addresses, values, abis);

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
