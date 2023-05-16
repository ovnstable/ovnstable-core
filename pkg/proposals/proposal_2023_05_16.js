const {getContract, execTimelock} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let StrategyMagpieOvnUsdp = await getContract('StrategyMagpieOvnUsdp', 'arbitrum');
    addresses.push(StrategyMagpieOvnUsdp.address);
    values.push(0);
    abis.push(StrategyMagpieOvnUsdp.interface.encodeFunctionData('upgradeTo', ['0xBf21CbE292b40347b3691C3187645501fc0E5F97']));


    let StrategyMagpieOvnDaiPlus = await getContract('StrategyMagpieOvnDaiPlus', 'arbitrum_dai');
    addresses.push(StrategyMagpieOvnDaiPlus.address);
    values.push(0);
    abis.push(StrategyMagpieOvnDaiPlus.interface.encodeFunctionData('upgradeTo', ['0xaa6cFd8a0ba4fA23f1a24a6Ac72717ba977fa739']));


    await createProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

