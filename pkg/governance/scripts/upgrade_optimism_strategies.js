const {getContract, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, execProposal, testProposal, testUsdPlus} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let StrategyArrakisUsdcDai = await getContract('StrategyArrakisUsdcDai');

    addresses.push(StrategyArrakisUsdcDai.address);
    values.push(0);
    abis.push(StrategyArrakisUsdcDai.interface.encodeFunctionData('upgradeTo', ['0xf1E736Bd81a64f7BBb42882628Cab7754b11D956']));

    let StrategyGammaUsdcDai = await getContract('StrategyGammaUsdcDai');

    addresses.push(StrategyGammaUsdcDai.address);
    values.push(0);
    abis.push(StrategyGammaUsdcDai.interface.encodeFunctionData('upgradeTo', ['0x18DFd867a29Fa57d5Cf23Ad0EB9f2Cf477b488Df']));

    await createProposal(addresses, values, abis);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

