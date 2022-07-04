const hre = require("hardhat");
const fs = require("fs");
const ethers = hre.ethers;

let {POLYGON} = require('@overnight-contracts/common/utils/assets');

const {getContract, getERC20, showM2M, execTimelock} = require("@overnight-contracts/common/utils/script-utils");

let strategyDystopiaUsdcDai = JSON.parse(fs.readFileSync('../strategies/polygon/deployments/localhost/StrategyDystopiaUsdcDai.json'));
let strategyDystopiaUsdcUsdt = JSON.parse(fs.readFileSync('../strategies/polygon/deployments/localhost/StrategyDystopiaUsdcUsdt.json'));

let dystToken = '0x39aB6574c289c3Ae4d88500eEc792AB5B947A5Eb';
let dystPairUsdcDai = '0xFec23508fE4b5d10A3eb0D83b9947CAa56F39463'; //sAMM-USDC/DAI
let dystRouter = '0xbE75Dd16D029c6B32B7aD57A0FD9C1c20Dd2862e'; //DystRouter01
let gaugeUsdcDai = '0x9c3Afbc9D0540168C6D4f3dA0F48FeBA6a3A7d2a'; //aka MasterChef
let penToken = '0x9008D70A5282a936552593f410AbcBcE2F891A97';
let userProxy = '0xc9Ae7Dac956f82074437C6D40f67D6a5ABf3E34b';
let penLens = '0x1432c3553FDf7FBD593a84B3A4d380c643cbf7a2';
let swapper = '0xf69f73Cac304A0433Ba414819E3e024Fd1Ce4fC8';
let dystPairUsdcUsdt = '0x4570da74232c1A784E77c2a260F85cdDA8e7d47B'; //sAMM-USDC/USDT
let gaugeUsdcUsdt = '0x7c9716266795a04ae1fbbd017dc2585fbf78076d'; //aka MasterChef


async function main() {

    await execTimelock(async (timelock)=>{

        await showM2M();

        let strategyUsdcDai = await ethers.getContractAt(strategyDystopiaUsdcDai.abi, strategyDystopiaUsdcDai.address);
        let strategyUsdcUsdt = await ethers.getContractAt(strategyDystopiaUsdcUsdt.abi, strategyDystopiaUsdcUsdt.address);
        let exchange = await getContract('Exchange');

        await exchange.connect(timelock).upgradeTo(strategyDystopiaUsdcDai.address);
        await exchange.connect(timelock).upgradeTo(strategyDystopiaUsdcUsdt.address);

        await (await strategyUsdcDai.setParams(
                gaugeUsdcDai,
                dystPairUsdcDai,
                dystRouter,
                POLYGON.balancerVault,
                POLYGON.balancerPoolIdUsdcTusdDaiUsdt,
                POLYGON.oracleChainlinkUsdc,
                POLYGON.oracleChainlinkDai,
                userProxy,
                penLens,
                synapseSwap
            )).wait();
        await (await strategyUsdcUsdt.setParams(
                gaugeUsdcUsdt,
                dystPairUsdcUsdt,
                dystRouter,
                POLYGON.balancerVault,
                POLYGON.balancerPoolIdUsdcTusdDaiUsdt,
                POLYGON.oracleChainlinkUsdc,
                POLYGON.oracleChainlinkUsdt,
                userProxy,
                penLens,
                synapseSwap
            )).wait();

        await showM2M();

        let usdc = await getERC20('usdc');
        await usdc.approve(exchange.address, toUSDC(1000000));
        await exchange.buy(usdc.address, toUSDC(1000000));

        await showM2M();

        await exchange.redeem(usdc.address, toUSDC(1000000));

        await showM2M();
    });

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

