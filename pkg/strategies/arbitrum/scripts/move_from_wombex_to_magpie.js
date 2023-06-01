const {getContract} = require("@overnight-contracts/common/utils/script-utils");

async function main() {

    let StrategyWombatDai = await getContract('StrategyWombatDai', 'arbitrum_dai');
    let StrategyMagpieDai = await getContract('StrategyMagpieDai', 'arbitrum_dai');
    await StrategyWombatDai.sendLPTokens(StrategyMagpieDai.address, 5000);
    await StrategyMagpieDai.stakeLPTokens();
    console.log("StrategyWombatDai -> StrategyMagpieDai done");

    let StrategyWombatOvnDaiPlus = await getContract('StrategyWombatOvnDaiPlus', 'arbitrum_dai');
    let StrategyMagpieOvnDaiPlus = await getContract('StrategyMagpieOvnDaiPlus', 'arbitrum_dai');
    await StrategyWombatOvnDaiPlus.sendLPTokens(StrategyMagpieOvnDaiPlus.address, 5000);
    await StrategyMagpieOvnDaiPlus.stakeLPTokens();
    console.log("StrategyWombatOvnDaiPlus -> StrategyMagpieOvnDaiPlus done");

    let StrategyWombatOvnUsdp = await getContract('StrategyWombatOvnUsdp', 'arbitrum');
    let StrategyMagpieOvnUsdp = await getContract('StrategyMagpieOvnUsdp', 'arbitrum');
    await StrategyWombatOvnUsdp.sendLPTokens(StrategyMagpieOvnUsdp.address, 5000);
    await StrategyMagpieOvnUsdp.stakeLPTokens();
    console.log("StrategyWombatOvnUsdp -> StrategyMagpieOvnUsdp done");

    let StrategyWombatUsdc = await getContract('StrategyWombatUsdc', 'arbitrum');
    let StrategyMagpieUsdc = await getContract('StrategyMagpieUsdc', 'arbitrum');
    await StrategyWombatUsdc.sendLPTokens(StrategyMagpieUsdc.address, 5000);
    await StrategyMagpieUsdc.stakeLPTokens();
    console.log("StrategyWombatUsdc -> StrategyMagpieUsdc done");

    let StrategyWombatUsdt = await getContract('StrategyWombatUsdt', 'arbitrum');
    let StrategyMagpieUsdt = await getContract('StrategyMagpieUsdt', 'arbitrum');
    await StrategyWombatUsdt.sendLPTokens(StrategyMagpieUsdt.address, 5000);
    await StrategyMagpieUsdt.stakeLPTokens();
    console.log("StrategyWombatUsdt -> StrategyMagpieUsdt done");

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

