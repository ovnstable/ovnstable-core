const {getContract, initWallet, getPrice, showHedgeM2M, execTimelock} = require("@overnight-contracts/common/utils/script-utils");
const {toUSDC} = require("@overnight-contracts/common/utils/decimals");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");
const {createProposal} = require("@overnight-contracts/common/utils/governance");

let dystRouter = '0xbE75Dd16D029c6B32B7aD57A0FD9C1c20Dd2862e'; //DystRouter01
let dystPair = '0x1A5FEBA5D5846B3b840312Bd04D76ddaa6220170'; //WMATIC/USD+
let gauge = '0x7c9716266795a04ae1fbbd017dc2585fbf78076d'; //aka MasterChef
let dystToken = '0x39aB6574c289c3Ae4d88500eEc792AB5B947A5Eb';


let penToken = '0x9008D70A5282a936552593f410AbcBcE2F891A97';
let penProxy = '0xc9Ae7Dac956f82074437C6D40f67D6a5ABf3E34b';
let penLens = '0x1432c3553FDf7FBD593a84B3A4d380c643cbf7a2';

let wmaticUsdcSlippagePersent = 10; //0.1%

let liquidationThreshold = 850;
let healthFactor = 1500
let balancingDelta = 1;

async function main() {

    let strategy = await getContract('StrategyUsdPlusWmatic');

    console.log('ETS address: ' + strategy.address);

    const exchange = await getContract('Exchange', 'polygon');
    const usdPlus = await getContract('UsdPlusToken', 'polygon');

    let setupParams = {
        // tokens
        usdc: POLYGON.usdc,
        aUsdc: POLYGON.amUsdc,
        wmatic: POLYGON.wMatic,
        usdPlus: usdPlus.address,
        penToken: penToken,
        dyst: dystToken,
        // common
        exchanger: exchange.address,
        dystRewards: gauge,
        dystVault: dystPair,
        dystRouter: dystRouter,
        penProxy: penProxy,
        penLens: penLens,
        wmaticUsdcSlippagePersent: wmaticUsdcSlippagePersent,
        // aave
        aavePoolAddressesProvider: POLYGON.aaveProvider,
        liquidationThreshold: liquidationThreshold,
        healthFactor: healthFactor,
        balancingDelta: balancingDelta,
    };

    // await execTimelock(async (timelock)=>{
    //
    //     console.log('Call upgradeTo()')
    //     await strategy.connect(timelock).upgradeTo('0x8f4D22a1de639eC3547138b1f8E53C8b1ABd7CE7');
    //
    //     console.log('Call setParams()');
    //     await strategy.connect(timelock).setParams(setupParams);
    //     await showHedgeM2M();
    //
    //     console.log('Call balance()')
    //     await strategy.balance();
    //     await showHedgeM2M();
    // });


    let addresses = [];
    let values = [];
    let abis = [];


    addresses.push(strategy.address);
    values.push(0);
    abis.push(strategy.interface.encodeFunctionData('upgradeTo', ['0x8f4D22a1de639eC3547138b1f8E53C8b1ABd7CE7']));

    addresses.push(strategy.address);
    values.push(0);
    abis.push(strategy.interface.encodeFunctionData('setParams', [setupParams]));

    addresses.push(strategy.address);
    values.push(0);
    abis.push(strategy.interface.encodeFunctionData('balance', []));

    await createProposal(addresses, values, abis);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
