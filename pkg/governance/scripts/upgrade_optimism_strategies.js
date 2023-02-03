const {getContract, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, execProposal, testProposal, testUsdPlus} = require("@overnight-contracts/common/utils/governance");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let soUsdt = '0xD84D315f22565399ABFCb2b9C836955401C01A47';
    let poolUsdcUsdtFee = 100; // 0.01%
    let StrategyReaperSonneUsdtParams = {
        usdcToken: OPTIMISM.usdc,
        usdtToken: OPTIMISM.usdt,
        soUsdt: soUsdt,
        oracleUsdc: OPTIMISM.oracleUsdc,
        oracleUsdt: OPTIMISM.oracleUsdt,
        uniswapV3Router: OPTIMISM.uniswapV3Router,
        poolUsdcUsdtFee: poolUsdcUsdtFee,
        curve3Pool: OPTIMISM.curve3Pool,
    };

    let rubiconUsdt = '0xffbd695bf246c514110f5dae3fa88b8c2f42c411';
    let poolUsdcOpFee = 500; // 0.05%
    let StrategyRubiconUsdtParams = {
        usdcToken: OPTIMISM.usdc,
        usdtToken: OPTIMISM.usdt,
        opToken: OPTIMISM.op,
        rubiconUsdt: rubiconUsdt,
        uniswapV3Router: OPTIMISM.uniswapV3Router,
        poolUsdcOpFee: poolUsdcOpFee,
        poolUsdcUsdtFee: poolUsdcUsdtFee,
        oracleUsdt: OPTIMISM.oracleUsdt,
        oracleUsdc: OPTIMISM.oracleUsdc,
        curve3Pool: OPTIMISM.curve3Pool,
    };

    let StrategyReaperSonneDai = await getContract('StrategyReaperSonneDai');

    addresses.push(StrategyReaperSonneDai.address);
    values.push(0);
    abis.push(StrategyReaperSonneDai.interface.encodeFunctionData('upgradeTo', ['0x09E1902AbcfB29f688049EF8D13e1B3Ba2966cba']));


    let StrategyRubiconDai = await getContract('StrategyRubiconDai');

    addresses.push(StrategyRubiconDai.address);
    values.push(0);
    abis.push(StrategyRubiconDai.interface.encodeFunctionData('upgradeTo', ['0x09E1902AbcfB29f688049EF8D13e1B3Ba2966cba']));


    let StrategyReaperSonneUsdt = await getContract('StrategyReaperSonneUsdt');

    addresses.push(StrategyReaperSonneUsdt.address);
    values.push(0);
    abis.push(StrategyReaperSonneUsdt.interface.encodeFunctionData('upgradeTo', ['0x09E1902AbcfB29f688049EF8D13e1B3Ba2966cba']));

    addresses.push(StrategyReaperSonneUsdt.address);
    values.push(0);
    abis.push(StrategyReaperSonneUsdt.interface.encodeFunctionData('setParams', [StrategyReaperSonneUsdtParams]));


    let StrategyRubiconUsdt = await getContract('StrategyRubiconUsdt');

    addresses.push(StrategyRubiconUsdt.address);
    values.push(0);
    abis.push(StrategyRubiconUsdt.interface.encodeFunctionData('upgradeTo', ['0x09E1902AbcfB29f688049EF8D13e1B3Ba2966cba']));

    addresses.push(StrategyRubiconUsdt.address);
    values.push(0);
    abis.push(StrategyRubiconUsdt.interface.encodeFunctionData('setParams', [StrategyRubiconUsdtParams]));


    await createProposal(addresses, values, abis);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

