const hre = require("hardhat");

const {getContract, showM2M, execTimelock} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal} = require("@overnight-contracts/common/utils/governance");
const {BSC} = require("@overnight-contracts/common/utils/assets");

let wom = '0xAD6742A35fB341A9Cc6ad674738Dd8da98b94Fb1';
let wmx = '0xa75d9ca2a0a1D547409D82e1B06618EC284A2CeD';
let lpBusd = '0xF319947eCe3823b790dd87b0A509396fE325745a';
let lpUsdc = '0xb43Ee2863370a56D3b7743EDCd8407259100b8e2';
let lpUsdt = '0x4F95fE57BEA74b7F642cF9c097311959B9b988F7';
let wmxLpBusd = '0x6e85a35fffe1326e230411f4f3c31c493b05263c';
let wmxLpUsdc = '0x6155e7d1c509f63109c6fc330bb5dd295034d540';
let wmxLpUsdt = '0x1964ffe993d1da4ca0c717c9ea16a7846b4f13ab';
let poolDepositor = '0xF1fE1a695b4c3e2297a37523E3675603C0892b00';
let pool = '0x312Bc7eAAF93f1C60Dc5AfC115FcCDE161055fb0';
let wombatRouter = '0x19609B03C976CCA288fbDae5c21d4290e9a4aDD7';


async function main() {

    let StrategyWombexBusd = await getContract('StrategyWombexBusd');
    let StrategyWombexUsdc = await getContract('StrategyWombexUsdc');
    let StrategyWombexUsdt = await getContract('StrategyWombexUsdt');


    let StrategyWombexBusdParams = {
        busd: BSC.busd,
        wom: wom,
        wmx: wmx,
        lpBusd: lpBusd,
        wmxLpBusd: wmxLpBusd,
        poolDepositor: poolDepositor,
        pool: pool,
        pancakeRouter: BSC.pancakeRouter,
    };

    let StrategyWombexUsdcParams = {
        busd: BSC.busd,
        usdc: BSC.usdc,
        wom: wom,
        wmx: wmx,
        lpUsdc: lpUsdc,
        wmxLpUsdc: wmxLpUsdc,
        poolDepositor: poolDepositor,
        pool: pool,
        pancakeRouter: BSC.pancakeRouter,
        wombatRouter: wombatRouter,
        oracleBusd: BSC.chainlinkBusd,
        oracleUsdc: BSC.chainlinkUsdc,
    };

    let StrategyWombexUsdtParams = {
        busd: BSC.busd,
        usdt: BSC.usdt,
        wom: wom,
        wmx: wmx,
        lpUsdt: lpUsdt,
        wmxLpUsdt: wmxLpUsdt,
        poolDepositor: poolDepositor,
        pool: pool,
        pancakeRouter: BSC.pancakeRouter,
        wombatRouter: wombatRouter,
        oracleBusd: BSC.chainlinkBusd,
        oracleUsdt: BSC.chainlinkUsdt,
    };

    let addresses = [];
    let values = [];
    let abis = [];

    addresses.push(StrategyWombexBusd.address);
    values.push(0);
    abis.push(StrategyWombexBusd.interface.encodeFunctionData('upgradeTo', ['0x1609B0849Ce1Ea7F1438ef86157Cd9C8e800B583']));

    addresses.push(StrategyWombexUsdc.address);
    values.push(0);
    abis.push(StrategyWombexUsdc.interface.encodeFunctionData('upgradeTo', ['0xa181Dc5ba8821aAba59eb0eA7f1AFA1c91A0dF22']));

    addresses.push(StrategyWombexUsdt.address);
    values.push(0);
    abis.push(StrategyWombexUsdt.interface.encodeFunctionData('upgradeTo', ['0x84eC45b33854C6D63B2e304aed9B9796092D86e2']));

    addresses.push(StrategyWombexBusd.address);
    values.push(0);
    abis.push(StrategyWombexBusd.interface.encodeFunctionData('setParams', [StrategyWombexBusdParams]));

    addresses.push(StrategyWombexUsdc.address);
    values.push(0);
    abis.push(StrategyWombexUsdc.interface.encodeFunctionData('setParams', [StrategyWombexUsdcParams]));

    addresses.push(StrategyWombexUsdt.address);
    values.push(0);
    abis.push(StrategyWombexUsdt.interface.encodeFunctionData('setParams', [StrategyWombexUsdtParams]));


    await testProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

