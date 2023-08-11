const {getContract, getPrice, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal} = require("@overnight-contracts/common/utils/governance");
const {fromE6, fromE18} = require("@overnight-contracts/common/utils/decimals");

async function main() {

    let pmUsd = await getContract('PortfolioManager', 'base');
    let pmDai = await getContract('PortfolioManager', 'base_dai');
    let baseSwap = await getContract('StrategyBaseSwapUsdbcDai', 'base');
    let uniV3Dai = await getContract('StrategyUniV3Dai', 'base_dai');

    // For test
    await (await uniV3Dai.resetNewPosition(-276300, -276299)).wait();
    await (await baseSwap.setSlippages(40, 20, 4)).wait();

    // Test block: 2489907

    await showM2M('base');
    await showM2M('base_dai');

    console.log('Balance DAI+');
    await (await pmDai.balance()).wait();
    await showM2M('base');
    await showM2M('base_dai');

    console.log('Balance USD+');
    await (await pmUsd.balance()).wait();
    await showM2M('base');
    await showM2M('base_dai');
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

