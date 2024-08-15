const {getContract, getPrice, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal} = require("@overnight-contracts/common/utils/governance");
const {fromE6, fromE18} = require("@overnight-contracts/common/utils/decimals");

async function main() {

    let morpho = await getContract('StrategyMorphoDirect', 'base');
    let morphoUsdc = await getContract('StrategyMorphoDirectUsdc', 'base_usdc');
    
    await (await morpho.setLimit(100)).wait();
    await (await morphoUsdc.setLimit(100)).wait();

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

