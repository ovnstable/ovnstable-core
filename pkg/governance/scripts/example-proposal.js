const hre = require("hardhat");

const {getContract, showM2M, execTimelock} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal} = require("@overnight-contracts/common/utils/governance");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

let lpToken = '0xaED05fdd471a4EecEe48B34d38c59CC76681A6C8';
let uniProxy = '0xf874D4957861E193AEC9937223062679C14f9Aca';
let masterChef = '0xC7846d1bc4d8bcF7c45a7c998b77cE9B3c904365';
let pid = 1;
let beethovenxVault = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
let beethovenxPoolIdUsdc = "0xba7834bb3cd2db888e6a06fb45e82b4225cd0c71000000000000000000000043";
let beethovenxPoolIdDaiUsdtUsdc = "0x6222ae1d2a9f6894da50aa25cb7b303497f9bebd000000000000000000000046";
let beethovenxPoolIdDai = "0x888a6195d42a95e80d81e1c506172772a80b80bc000000000000000000000044";
let bbRfAUsdc = "0xba7834bb3cd2DB888E6A06Fb45E82b4225Cd0C71";
let bbRfADai = "0x888a6195D42a95e80D81e1c506172772a80b80Bc";
let poolFeeOpUsdc = 500; // 0.05%
let kyberSwapRouter = "0xC1e7dFE73E1598E3910EF4C7845B68A9Ab6F4c83";
let poolUsdcDaiFee = 8; // 0.008%


async function main() {

    let StrategyGammaUsdcDai = await getContract('StrategyGammaUsdcDai');

    let StrategyGammaUsdcDaiParams = {
        usdc: OPTIMISM.usdc,
        dai: OPTIMISM.dai,
        op: OPTIMISM.op,
        lpToken: lpToken,
        uniProxy: uniProxy,
        masterChef: masterChef,
        pid: pid,
        beethovenxVault: beethovenxVault,
        beethovenxPoolIdUsdc: beethovenxPoolIdUsdc,
        beethovenxPoolIdDaiUsdtUsdc: beethovenxPoolIdDaiUsdtUsdc,
        beethovenxPoolIdDai: beethovenxPoolIdDai,
        bbRfAUsdc: bbRfAUsdc,
        bbRfADai: bbRfADai,
        uniswapV3Router: OPTIMISM.uniswapV3Router,
        poolFeeOpUsdc: poolFeeOpUsdc,
        oracleUsdc: OPTIMISM.oracleUsdc,
        oracleDai: OPTIMISM.oracleDai,
        kyberSwapRouter: kyberSwapRouter,
        poolUsdcDaiFee: poolUsdcDaiFee,
    };

    let addresses = [];
    let values = [];
    let abis = [];

    addresses.push(StrategyGammaUsdcDai.address);
    values.push(0);
    abis.push(StrategyGammaUsdcDai.interface.encodeFunctionData('upgradeTo', ['0x53b5932caaD2B8d62199e092b933d9892ea2c8c3']));

    addresses.push(StrategyGammaUsdcDai.address);
    values.push(0);
    abis.push(StrategyGammaUsdcDai.interface.encodeFunctionData('setParams', [StrategyGammaUsdcDaiParams]));

    await testProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

