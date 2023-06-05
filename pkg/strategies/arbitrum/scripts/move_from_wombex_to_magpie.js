const {getContract, showM2M} = require("@overnight-contracts/common/utils/script-utils");

async function main() {

    await showM2M();

    let StrategyWombatUsdc = await getContract('StrategyWombatUsdc', 'arbitrum');
    let StrategyMagpieUsdc = await getContract('StrategyMagpieUsdc', 'arbitrum');
    await (await StrategyWombatUsdc.sendLPTokens(StrategyMagpieUsdc.address, 5000)).wait();
    await (await StrategyMagpieUsdc.stakeLPTokens()).wait();
    console.log("StrategyWombatUsdc -> StrategyMagpieUsdc done");

    let StrategyWombatUsdt = await getContract('StrategyWombatUsdt', 'arbitrum');
    let StrategyMagpieUsdt = await getContract('StrategyMagpieUsdt', 'arbitrum');
    await (await StrategyWombatUsdt.sendLPTokens(StrategyMagpieUsdt.address, 5000)).wait();
    await (await StrategyMagpieUsdt.stakeLPTokens()).wait();
    console.log("StrategyWombatUsdt -> StrategyMagpieUsdt done");

    await showM2M();
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

