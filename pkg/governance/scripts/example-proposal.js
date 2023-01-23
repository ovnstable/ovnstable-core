const hre = require("hardhat");

const {
    getContract,
    showM2M,
    execTimelock,
    initWallet,
    convertWeights,
    getERC20
} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal} = require("@overnight-contracts/common/utils/governance");
const {BSC} = require("@overnight-contracts/common/utils/assets");
const {toE18, fromE18} = require("@overnight-contracts/common/utils/decimals");

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


async function main() {

    let strategyWombexBusd = await getContract('StrategyWombexBusd');
    let strategyWombexUsdc = await getContract('StrategyWombexUsdc');
    let strategyWombexUsdt = await getContract('StrategyWombexUsdt');


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
        wombatRouter: BSC.wombatRouter,
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
        wombatRouter: BSC.wombatRouter,
        oracleBusd: BSC.chainlinkBusd,
        oracleUsdt: BSC.chainlinkUsdt,
    };

    let addresses = [];
    let values = [];
    let abis = [];

    addresses.push(strategyWombexBusd.address);
    values.push(0);
    abis.push(strategyWombexBusd.interface.encodeFunctionData('upgradeTo', ['0x1609B0849Ce1Ea7F1438ef86157Cd9C8e800B583']));

    addresses.push(strategyWombexUsdc.address);
    values.push(0);
    abis.push(strategyWombexUsdc.interface.encodeFunctionData('upgradeTo', ['0xa181Dc5ba8821aAba59eb0eA7f1AFA1c91A0dF22']));

    addresses.push(strategyWombexUsdt.address);
    values.push(0);
    abis.push(strategyWombexUsdt.interface.encodeFunctionData('upgradeTo', ['0x84eC45b33854C6D63B2e304aed9B9796092D86e2']));

    addresses.push(strategyWombexBusd.address);
    values.push(0);
    abis.push(strategyWombexBusd.interface.encodeFunctionData('setParams', [StrategyWombexBusdParams]));

    addresses.push(strategyWombexUsdc.address);
    values.push(0);
    abis.push(strategyWombexUsdc.interface.encodeFunctionData('setParams', [StrategyWombexUsdcParams]));

    addresses.push(strategyWombexUsdt.address);
    values.push(0);
    abis.push(strategyWombexUsdt.interface.encodeFunctionData('setParams', [StrategyWombexUsdtParams]));


    await createProposal(addresses, values, abis);
    // await testProposal(addresses, values, abis);
    //
    //
    // let wallet = await initWallet();
    // await execTimelock(async (timelock) => {
    //
    //     await showM2M();
    //
    //     await strategyWombexBusd.connect(timelock).setPortfolioManager(wallet.address);
    //     await strategyWombexUsdc.connect(timelock).setPortfolioManager(wallet.address);
    //     await strategyWombexUsdt.connect(timelock).setPortfolioManager(wallet.address);
    //
    //     let busd = await getERC20('busd', wallet);
    //     console.log('BUSD ' + fromE18(await busd.balanceOf(wallet.address)));
    //     await strategyWombexBusd.unstake(BSC.busd, toE18(100), wallet.address, false);
    //     await strategyWombexUsdc.unstake(BSC.busd, toE18(100), wallet.address, false);
    //     await strategyWombexUsdt.unstake(BSC.busd, toE18(100), wallet.address, false);
    //
    //     console.log('BUSD ' + fromE18(await busd.balanceOf(wallet.address)));
    //     await showM2M();
    //
    //     await busd.connect(wallet).transfer(strategyWombexBusd.address, toE18(100));
    //     await strategyWombexBusd.stake(BSC.busd, toE18(100));
    //     await busd.connect(wallet).transfer(strategyWombexUsdc.address, toE18(100));
    //     await strategyWombexUsdc.stake(BSC.busd, toE18(100));
    //     await busd.connect(wallet).transfer(strategyWombexUsdt.address, toE18(100));
    //     await strategyWombexUsdt.stake(BSC.busd, toE18(100));
    //
    //     console.log('BUSD ' + fromE18(await busd.balanceOf(wallet.address)));
    //     await showM2M();
    //
    //     console.log('ClaimRewards');
    //     await strategyWombexBusd.claimRewards(wallet.address);
    //     console.log('BUSD ' + fromE18(await busd.balanceOf(wallet.address)));
    //     await strategyWombexUsdc.claimRewards(wallet.address);
    //     console.log('BUSD ' + fromE18(await busd.balanceOf(wallet.address)));
    //     await strategyWombexUsdt.claimRewards(wallet.address);
    //     console.log('BUSD ' + fromE18(await busd.balanceOf(wallet.address)));
    // });
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

