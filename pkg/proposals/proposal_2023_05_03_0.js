const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal} = require("@overnight-contracts/common/utils/governance");
const {ARBITRUM} = require("@overnight-contracts/common/utils/assets");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let StrategyEtsZeta = await getContract('StrategyEtsZeta');

    let StrategyEtsZetaParams = {
        asset: ARBITRUM.usdc,
        rebaseToken: '0x66bB3eEe47D0E919d6A4fBB919fa3024C1A53F80',
        hedgeExchanger: '0x3271371d5AD147140BF321b6ED859CC02AFce973',
    };

    addresses.push(StrategyEtsZeta.address);
    values.push(0);
    abis.push(StrategyEtsZeta.interface.encodeFunctionData('setParams', [StrategyEtsZetaParams]));


    await createProposal(addresses, values, abis);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

