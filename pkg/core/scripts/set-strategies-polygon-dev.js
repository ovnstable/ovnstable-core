const hre = require("hardhat");
const fs = require("fs");
const {fromE18, toE6, fromE6} = require("@overnight-contracts/common/utils/decimals");
const ethers = hre.ethers;

const {
    getContract, showM2M, getPrice
} = require("@overnight-contracts/common/utils/script-utils");


async function main() {
    // need to run inside IDEA via node script running
    await hre.run("compile");

    let pm = await getContract('PortfolioManager');

    console.log('M2M before:')
    await showM2M();


    let aave = {
        strategy: "0x81AfC1b2b12C6bA97adf68f39bc819e1CC67cE2D",
        minWeight: 0,
        targetWeight: 6000,
        maxWeight: 25000,
        enabled: true,
        enabledReward: true,
    }

    let DodoUSDC = {
        strategy: "0x52664Dce9E0fc9aB63d148CeeEc365b93690a985",
        minWeight: 0,
        targetWeight: 15000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    let DodoUSDT = {
        strategy: "0x69C466cd299e9BcEdF29C56F713bd4b730CbAb1f",
        minWeight: 0,
        targetWeight: 15000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    let ArrakisUSDCUSDTBorrow = {
        strategy: "0x273313bA28bfb4F6C84fBFb09E64F849eA2099d3",
        minWeight: 0,
        targetWeight: 15000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    let DystopiaUSDCDAI = {
        strategy: "0x123a8643A90Bc2C03cC9Ba2A127c952f4e81236f",
        minWeight: 0,
        targetWeight: 15000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    let MeshSwapUSDC = {
        strategy: "0x250A2A3A64972ca85A415b600D79f6F35dD7CF41",
        minWeight: 0,
        targetWeight: 10000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    let MeshSwapUSDCUSDT = {
        strategy: "0xb3329b664e4243259fDa55650d44C5f9B1Ca83fD",
        minWeight: 0,
        targetWeight: 10000,
        maxWeight: 100000,
        enabled: false,
        enabledReward: true,
    }

    let ArrakisUSDCWETHBorrow = {
        strategy: "0x34a525B2D55584D9974aECD6A6C53928bF953Dec",
        minWeight: 0,
        targetWeight: 7000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    let ArrakisUSDCWMATICBorrow = {
        strategy: "0x28f16c9674671E2D6915518C67C99f93e4afE9Ee",
        minWeight: 0,
        targetWeight: 7000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    let weights = [
        aave,
        DodoUSDC,
        DodoUSDT,
        ArrakisUSDCUSDTBorrow,
        DystopiaUSDCDAI,
        MeshSwapUSDC,
        MeshSwapUSDCUSDT,
        ArrakisUSDCWETHBorrow,
        ArrakisUSDCWMATICBorrow
    ]


    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
        sum += weights[i].targetWeight;
    }

    if (sum !== 100000) {
        console.log(`Total weight not 100000`)
        return
    }

    console.log('TargetWeight: ' + sum);

    await (await pm.setStrategyWeights(weights, await getPrice())).wait();
    console.log("portfolio.setWeights done");

    await (await pm.balance(await getPrice())).wait();
    console.log("portfolio.balance done");

    console.log('M2M after:')
    await showM2M();

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

