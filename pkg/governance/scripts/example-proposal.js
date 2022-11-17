const hre = require("hardhat");

const {getContract, showM2M, execTimelock} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");

const {BSC} = require("@overnight-contracts/common/utils/assets");

let wom = '0xAD6742A35fB341A9Cc6ad674738Dd8da98b94Fb1';
let wmx = '0xa75d9ca2a0a1D547409D82e1B06618EC284A2CeD';
let lpBusd = '0xF319947eCe3823b790dd87b0A509396fE325745a';
let lpUsdc = '0xb43Ee2863370a56D3b7743EDCd8407259100b8e2';
let lpUsdt = '0x4F95fE57BEA74b7F642cF9c097311959B9b988F7';
let wmxLpBusd = '0x6e85a35fffe1326e230411f4f3c31c493b05263c';
let wmxLpUsdc = '0x6155e7d1c509f63109c6fc330bb5dd295034d540';
let wmxLpUsdt = '0x1964ffe993d1da4ca0c717c9ea16a7846b4f13ab';
let poolDepositor = '0xBc502Eb6c9bAD77929dabeF3155967E0ABfA9209';
let pool = '0x312Bc7eAAF93f1C60Dc5AfC115FcCDE161055fb0';
let wombatRouter = '0x19609B03C976CCA288fbDae5c21d4290e9a4aDD7';


async function main() {

    await test();
//    await proposal();

}

async function test(){

    await execTimelock(async (timelock)=>{

        await showM2M();

        let StrategyWombexBusd = await getContract('StrategyWombexBusd');
        let StrategyWombexUsdc = await getContract('StrategyWombexUsdc');
        let StrategyWombexUsdt = await getContract('StrategyWombexUsdt');

        let pm = await getContract('PortfolioManager');

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

        await StrategyWombexBusd.connect(timelock).upgradeTo('0xf4b175330De5671Cb7F13F8CF1Dcb2Fff6E7c7E3');
        await StrategyWombexUsdc.connect(timelock).upgradeTo('0x3dB8C161fe6F9b40A4bF40dF77753Bad6C9f4Ed8');
        await StrategyWombexUsdt.connect(timelock).upgradeTo('0xF6a9551A4f1BB921C2bA234923b5f48BbB6B2E43');

        await StrategyWombexBusd.connect(timelock).setParams(StrategyWombexBusdParams);
        await StrategyWombexUsdc.connect(timelock).setParams(StrategyWombexUsdcParams);
        await StrategyWombexUsdt.connect(timelock).setParams(StrategyWombexUsdtParams);

        await pm.connect(timelock).removeStrategy('0x9D430C0A05da519335ee022ECF8f7690F1d402Ba');

        await showM2M();
    });
}


async function proposal(){

    let StrategyWombexBusd = await getContract('StrategyWombexBusd');
    let StrategyWombexUsdc = await getContract('StrategyWombexUsdc');
    let StrategyWombexUsdt = await getContract('StrategyWombexUsdt');

    let pm = await getContract('PortfolioManager');

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
    abis.push(StrategyWombexBusd.interface.encodeFunctionData('upgradeTo', ['0xf4b175330De5671Cb7F13F8CF1Dcb2Fff6E7c7E3']));

    addresses.push(StrategyWombexUsdc.address);
    values.push(0);
    abis.push(StrategyWombexUsdc.interface.encodeFunctionData('upgradeTo', ['0x3dB8C161fe6F9b40A4bF40dF77753Bad6C9f4Ed8']));

    addresses.push(StrategyWombexUsdt.address);
    values.push(0);
    abis.push(StrategyWombexUsdt.interface.encodeFunctionData('upgradeTo', ['0xF6a9551A4f1BB921C2bA234923b5f48BbB6B2E43']));

    addresses.push(StrategyWombexBusd.address);
    values.push(0);
    abis.push(StrategyWombexBusd.interface.encodeFunctionData('setParams', [StrategyWombexBusdParams]));

    addresses.push(StrategyWombexUsdc.address);
    values.push(0);
    abis.push(StrategyWombexUsdc.interface.encodeFunctionData('setParams', [StrategyWombexUsdcParams]));

    addresses.push(StrategyWombexUsdt.address);
    values.push(0);
    abis.push(StrategyWombexUsdt.interface.encodeFunctionData('setParams', [StrategyWombexUsdtParams]));

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('removeStrategy', ['0x9D430C0A05da519335ee022ECF8f7690F1d402Ba']));


    await createProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

