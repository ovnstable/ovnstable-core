const hre = require("hardhat");
const {getContract, showM2M, execTimelock, initWallet, convertWeights} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal, testUsdPlus, testStrategy} = require("@overnight-contracts/common/utils/governance");
let {BSC} = require('@overnight-contracts/common/utils/assets');
const {Roles} = require("@overnight-contracts/common/utils/roles");

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

    let timelock = await getContract('OvnTimelockController');
    let PortfolioManager = await getContract('PortfolioManager');

    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('grantRole', [Roles.PORTFOLIO_AGENT_ROLE, timelock.address]));


    let StrategyVenusBusd = await getContract('StrategyVenusBusd');

    addresses.push(StrategyVenusBusd.address);
    values.push(0);
    abis.push(StrategyVenusBusd.interface.encodeFunctionData('upgradeTo', ['0x98516353dE7c6EfBaD39d11ace806041070EEf11']));

    addresses.push(StrategyVenusBusd.address);
    values.push(0);
    abis.push(StrategyVenusBusd.interface.encodeFunctionData('setSlippages', [20, 20, 4]));


    let StrategyVenusBusdParams = {
        busdToken: BSC.busd,
        vBusdToken: BSC.vBusd,
        unitroller: BSC.unitroller,
        pancakeRouter: BSC.pancakeRouter,
        xvsToken: BSC.xvs,
        wbnbToken: BSC.wBnb,
        wombatRouter: BSC.wombatRouter,
        wombatPool: BSC.wombatPool,
        usdcToken: BSC.usdc,
        oracleUsdc: BSC.chainlinkUsdc,
        oracleBusd: BSC.chainlinkBusd,
    }

    addresses.push(StrategyVenusBusd.address);
    values.push(0);
    abis.push(StrategyVenusBusd.interface.encodeFunctionData('setParams', [StrategyVenusBusdParams]));

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

    addresses.push(StrategyEtsAlpha.address);
    values.push(0);
    abis.push(StrategyEtsAlpha.interface.encodeFunctionData('setSlippages', [20, 20, 4]));



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
    abis.push(StrategyWombexBusd.interface.encodeFunctionData('upgradeTo', ['0xdA6EDf15c94bfDa6E9A6F2281f715949ec605Dac']));

    addresses.push(StrategyWombexBusd.address);
    values.push(0);
    abis.push(StrategyWombexBusd.interface.encodeFunctionData('setParams', [StrategyWombexBusdParams]));


    let StrategyWombexUsdc = await getContract('StrategyWombexUsdc');

    addresses.push(StrategyWombexUsdc.address);
    values.push(0);
    abis.push(StrategyWombexUsdc.interface.encodeFunctionData('upgradeTo', ['0x9b14e4Af80247973d4FE9FC12c2343E472f2D3F5']));



    let StrategyEllipsisDotDotBusd = await getContract('StrategyEllipsisDotDotBusd');

    addresses.push(StrategyEllipsisDotDotBusd.address);
    values.push(0);
    abis.push(StrategyEllipsisDotDotBusd.interface.encodeFunctionData('upgradeTo', ['0x44cD53c5Fa8F64A102D629924Ab664E4D17C05e2']));


    let StrategyVenusUsdc = await getContract('StrategyVenusUsdc');

    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('addStrategy', [StrategyVenusUsdc.address]));

    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('setAsset', [BSC.usdc]));

    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('setCashStrategy', [StrategyVenusUsdc.address]));



    addresses.push(StrategyWombexUsdc.address);
    values.push(0);
    abis.push(StrategyWombexUsdc.interface.encodeFunctionData('setSlippages', [20, 20, 4]));

    addresses.push(StrategyWombexBusd.address);
    values.push(0);
    abis.push(StrategyWombexBusd.interface.encodeFunctionData('setSlippages', [20, 20, 4]));


    let Exchange = await getContract('Exchange');
    let UsdPlusToken = await getContract('UsdPlusToken');

    addresses.push(Exchange.address);
    values.push(0);
    abis.push(Exchange.interface.encodeFunctionData('setTokens', [UsdPlusToken.address, BSC.usdc]));


    // await showM2M();
    // await testProposal(addresses, values, abis);
    // await testUsdPlus();
    // await showM2M();


    // let weights = [
    //     {
    //         "strategy": "0xA2007Ae378d95C7c5Fe9f166DB17307d32cb8893",
    //         "name": "Venus BUSD",
    //         "minWeight": 0,
    //         "targetWeight": 0,
    //         "riskFactor": 0,
    //         "maxWeight": 100,
    //         "enabled": false,
    //         "enabledReward": true
    //     },
    //     {
    //         "strategy": "0x27D9425bE1375E7CBB38b9FAaDbD446a0196E6eD",
    //         "name": "Venus USDC",
    //         "minWeight": 0,
    //         "targetWeight": 2.5,
    //         "riskFactor": 0,
    //         "maxWeight": 100,
    //         "enabled": true,
    //         "enabledReward": true
    //     },
    //     {
    //         "strategy": "0x621409Ad21B486eA8688c5608abc904Cd8DB8e9b",
    //         "name": "Wombex USDC",
    //         "minWeight": 0,
    //         "targetWeight": 20,
    //         "riskFactor": 0,
    //         "maxWeight": 100,
    //         "enabled": true,
    //         "enabledReward": true
    //     },
    //     {
    //         "strategy": "0xFe7f3FEa8972313F859194EE00158798be3ED108",
    //         "name": "Wombex BUSD",
    //         "minWeight": 0,
    //         "targetWeight": 47,
    //         "riskFactor": 0,
    //         "maxWeight": 100,
    //         "enabled": true,
    //         "enabledReward": true
    //     },
    //     {
    //         "strategy": "0x2EBe7e883DBD37D8Bd228e1883De392031068698",
    //         "name": "ETS ALPHA",
    //         "minWeight": 0,
    //         "targetWeight": 1,
    //         "riskFactor": 0,
    //         "maxWeight": 100,
    //         "enabled": true,
    //         "enabledReward": false
    //     },
    //     {
    //         "strategy": "0x970D50d09F3a656b43E11B0D45241a84e3a6e011",
    //         "name": "Ellipsis DotDot",
    //         "minWeight": 0,
    //         "targetWeight": 29.5,
    //         "riskFactor": 0,
    //         "maxWeight": 100,
    //         "enabled": true,
    //         "enabledReward": true
    //     }
    // ]
    //
    // weights = await convertWeights(weights);
    //
    // await execTimelock(async (timelock)=>{
    //
    //     await showM2M();
    //     let pm = await getContract('PortfolioManager');
    //     await pm.connect(timelock).setStrategyWeights(weights);
    //     await pm.connect(timelock).balance();
    //     await showM2M();
    // });

    // await testStrategy(StrategyWombexBusd);
    // await testStrategy(StrategyWombexUsdc);
    // await testStrategy(StrategyVenusBusd);
    // await testStrategy(StrategyVenusUsdc);
    // await testStrategy(StrategyEllipsisDotDotBusd);
    // await testStrategy(StrategyEtsAlpha);

    await createProposal(addresses, values, abis);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

