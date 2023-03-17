const hre = require("hardhat");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal} = require("@overnight-contracts/common/utils/governance");
let {BSC} = require('@overnight-contracts/common/utils/assets');

let rebaseToken = '0x5B852898CD47d2Be1d77D30377b3642290f5Ec75';
let hedgeExchanger = '0x65AfD05fbc4413948ffaaD8bCb13f71b6f79332D';
let wombatPool = '0x312Bc7eAAF93f1C60Dc5AfC115FcCDE161055fb0';
let wom = '0xAD6742A35fB341A9Cc6ad674738Dd8da98b94Fb1';
let wmx = '0xa75d9ca2a0a1D547409D82e1B06618EC284A2CeD';
let lpBusd = '0xF319947eCe3823b790dd87b0A509396fE325745a';
let wmxLpBusd = '0x6e85a35fffe1326e230411f4f3c31c493b05263c';
let poolDepositor = '0xF1fE1a695b4c3e2297a37523E3675603C0892b00';
let pool = '0x312Bc7eAAF93f1C60Dc5AfC115FcCDE161055fb0';

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let StrategyEtsAlpha = await getContract('StrategyEtsAlpha');
    let StrategyEtsAlphaParams = {
        asset: BSC.usdc,
        busd: BSC.busd,
        rebaseToken: rebaseToken,
        hedgeExchanger: hedgeExchanger,
        wombatRouter: BSC.wombatRouter,
        wombatPool: wombatPool,
        oracleAsset: BSC.chainlinkUsdc,
        oracleBusd: BSC.chainlinkBusd,
    };

    addresses.push(StrategyEtsAlpha.address);
    values.push(0);
    abis.push(StrategyEtsAlpha.interface.encodeFunctionData('upgradeTo', ['0x5339459d2912234cFc9E35d6afA4B7958830277e']));

    addresses.push(StrategyEtsAlpha.address);
    values.push(0);
    abis.push(StrategyEtsAlpha.interface.encodeFunctionData('setParams', [StrategyEtsAlphaParams]));


    let StrategyWombexBusd = await getContract('StrategyWombexBusd');
    let StrategyWombexBusdParams = {
        busd: BSC.busd,
        usdc: BSC.usdc,
        wom: wom,
        wmx: wmx,
        lpBusd: lpBusd,
        wmxLpBusd: wmxLpBusd,
        poolDepositor: poolDepositor,
        pool: pool,
        pancakeRouter: BSC.pancakeRouter,
        wombatRouter: BSC.wombatRouter,
        oracleBusd: BSC.chainlinkBusd,
        oracleUsdc: BSC.chainlinkUsdc,
    };

    addresses.push(StrategyWombexBusd.address);
    values.push(0);
    abis.push(StrategyWombexBusd.interface.encodeFunctionData('upgradeTo', ['0x93050114431d4A485c9039f8cd4e4cF772CE82f5']));

    addresses.push(StrategyWombexBusd.address);
    values.push(0);
    abis.push(StrategyWombexBusd.interface.encodeFunctionData('setParams', [StrategyWombexBusdParams]));


    let StrategyWombexUsdc = await getContract('StrategyWombexUsdc');

    addresses.push(StrategyWombexUsdc.address);
    values.push(0);
    abis.push(StrategyWombexUsdc.interface.encodeFunctionData('upgradeTo', ['0xD64c63B936e66fA57d5E3224A7bdDbADcE367175']));


    let StrategyEllipsisDotDotBusd = await getContract('StrategyEllipsisDotDotBusd');

    addresses.push(StrategyEllipsisDotDotBusd.address);
    values.push(0);
    abis.push(StrategyEllipsisDotDotBusd.interface.encodeFunctionData('upgradeTo', ['0x44cD53c5Fa8F64A102D629924Ab664E4D17C05e2']));


    let PortfolioManager = await getContract('PortfolioManager');
    let StrategyVenusUsdc = await getContract('StrategyVenusUsdc');

    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('addStrategy', [StrategyVenusUsdc.address]));

    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('setCashStrategy', [StrategyVenusUsdc.address]));

    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('setAsset', [BSC.usdc]));


    let Exchange = await getContract('Exchange');
    let UsdPlusToken = await getContract('UsdPlusToken');

    addresses.push(Exchange.address);
    values.push(0);
    abis.push(Exchange.interface.encodeFunctionData('setTokens', [UsdPlusToken.address, BSC.usdc]));


    await testProposal(addresses, values, abis);

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

