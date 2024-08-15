const {verify} = require("@overnight-contracts/common/utils/verify-utils");
const {getContract, showM2M, getImplementation} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal, testStrategy} = require("@overnight-contracts/common/utils/governance");
const {StrategyKyberSwapUsdcUsdt} = require("../deploy/48_kyberswap_usdc_usdt");
const {StrategyKyberSwapUsdcDai} = require("../deploy/49_kyberswap_usdc_dai");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let usdt = await getContract('StrategyKyberSwapUsdcUsdt', 'optimism');
    let dai = await getContract('StrategyKyberSwapUsdcDai', 'optimism');

    addresses.push(usdt.address);
    values.push(0);
    abis.push(usdt.interface.encodeFunctionData('upgradeTo', [await getImplementation('StrategyKyberSwapUsdcUsdt', 'optimism')]));

    addresses.push(usdt.address);
    values.push(0);
    abis.push(usdt.interface.encodeFunctionData('setParams', [await StrategyKyberSwapUsdcUsdt()]));

    addresses.push(dai.address);
    values.push(0);
    abis.push(dai.interface.encodeFunctionData('upgradeTo', [await getImplementation('StrategyKyberSwapUsdcDai', 'optimism')]));

    addresses.push(dai.address);
    values.push(0);
    abis.push(dai.interface.encodeFunctionData('setParams', [await StrategyKyberSwapUsdcDai()]));

    // await showM2M();
    // await testProposal(addresses, values, abis);
    // await showM2M();
    await createProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

