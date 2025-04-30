const { expect } = require("chai");
const { deployments, ethers, getNamedAccounts } = require("hardhat");
const {
    transferAsset,
    getERC20,
    transferETH,
    initWallet,
    execTimelock,
    getContract,
    getChainId,
    findEvent
} = require("@overnight-contracts/common/utils/script-utils");
const { resetHardhat, greatLess, resetHardhatToLastBlock } = require("@overnight-contracts/common/utils/tests");
const BN = require("bn.js");
const hre = require("hardhat");
const { sharedBeforeEach } = require("@overnight-contracts/common/utils/sharedBeforeEach");
const { toE6, fromE6, fromE18, toAsset, toE18 } = require("@overnight-contracts/common/utils/decimals");
const axios = require("axios");
const { default: BigNumber } = require("bignumber.js");
const { getOdosAmountOut, getOdosSwapData } = require("@overnight-contracts/common/utils/odos-helper");
const { getOdosAmountOutOnly } = require("@overnight-contracts/common/utils/odos-helper.js");

async function main() {
    const signers = await ethers.getSigners();
    const account = signers[0];

    let timelockAddress = "0x8ab9012D1BfF1b62c2ad82AE0106593371e6b247";

    if (hre.network.name === 'localhost') {
        // if (((hre.ovn && hre.ovn.stand) || process.env.STAND).startsWith('zksync')) {
        //     hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8011')
        // } else {
        hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545')
        // }
    }

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [timelockAddress],
    });

    const account3 = await hre.ethers.getSigner(timelockAddress);
    const dev6 = await hre.ethers.getSigner("0x68f504f38a5E6C04670883739d34538Fd66aC990");
    // let account1 = await ethers.getImpersonatedSigner("0x086dFe298907DFf27BD593BD85208D57e0155c94");

    await transferETH(10, account3.address);

    
    console.log(account.address);
    console.log(account3.address);
    console.log((await account3.getBalance()).toString());

    console.log(account.address);
    console.log((await account.getBalance()).toString());

    let ex = await getContract('FundExchange');
    let fund = await getContract('MotivationalFund');
    let pm = await getContract('FundPortfolioManager');

    let cashStrategyAddress = "0xC4dDdfd7f03557DD66503b46Bdf5C7AdCf3412EC";
    let newStrategyAddress = "0xFD8EC2afEC60e8B38BF5174EF0fC639A0ea5ABA2";

    console.log(await pm.getAllStrategyWeights());

    console.log("adding new strategy...");
    await (await pm.connect(account3).addStrategy(newStrategyAddress)).wait();
    console.log("new strategy added");

    console.log(await pm.getAllStrategyWeights());


    let strategy1 = {
        strategy: cashStrategyAddress,
        minWeight: 0,
        targetWeight: 99000,
        maxWeight: 100000,
        riskFactor: 0,
        enabled: true,
        enabledReward: false,
    }

    let strategy2 = {
        strategy: newStrategyAddress,
        minWeight: 0,
        targetWeight: 1000,
        maxWeight: 100000,
        riskFactor: 0,
        enabled: true,
        enabledReward: false,
    }

    let weights = [
        strategy1,
        strategy2,
    ]

    console.log("setting strategy weights...");
    await (await pm.connect(account3).setStrategyWeights(weights)).wait();
    console.log("strategy weights set");

    console.log(await pm.getAllStrategyWeights());

    console.log("checking balance...");
    await (await pm.balance()).wait();
    console.log("balance checked");

    strategyWeights = await pm.getAllStrategyWeights();
    console.log(strategyWeights);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
