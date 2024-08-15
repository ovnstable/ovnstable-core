const {getContract} = require("@overnight-contracts/common/utils/script-utils");

async function main() {

    let StrategyWombexUsdt = await getContract('StrategyWombexUsdt', 'bsc_usdt');
    let StrategyMagpieUsdt = await getContract('StrategyMagpieUsdt', 'bsc_usdt');
    await StrategyWombexUsdt.sendLPTokens(StrategyMagpieUsdt.address, 5000);
    await StrategyMagpieUsdt.stakeLPTokens();
    console.log("StrategyWombexUsdt -> StrategyMagpieUsdt done");

    let StrategyWombexUsdc = await getContract('StrategyWombexUsdc', 'bsc');
    let StrategyMagpieUsdc = await getContract('StrategyMagpieUsdc', 'bsc');
    await StrategyWombexUsdc.sendLPTokens(StrategyMagpieUsdc.address, 5000);
    await StrategyMagpieUsdc.stakeLPTokens();
    console.log("StrategyWombexUsdc -> StrategyMagpieUsdc done");

    let StrategyWombexBusd = await getContract('StrategyWombexBusd', 'bsc');
    let StrategyMagpieBusd = await getContract('StrategyMagpieBusd', 'bsc');
    await StrategyWombexBusd.sendLPTokens(StrategyMagpieBusd.address, 5000);
    await StrategyMagpieBusd.stakeLPTokens();
    console.log("StrategyWombexBusd -> StrategyMagpieBusd done");

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

