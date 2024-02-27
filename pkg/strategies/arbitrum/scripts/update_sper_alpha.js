const { getContract, showM2M, execTimelock, getERC20ByAddress, initWallet } = require("@overnight-contracts/common/utils/script-utils");
const { testProposal, createProposal } = require("@overnight-contracts/common/utils/governance");
const { fromE18 } = require("@overnight-contracts/common/utils/decimals");
const { BigNumber } = require("ethers");

async function main() {


    let pm = await getContract('PortfolioManager', 'arbitrum');
    let strategyWeights = await pm.getAllStrategyWeights();
    let strategyWeightsCorrected = []
    // for (const strategyWeight of strategyWeights) {
    //     strategyWeightsCorrected.push({
    //         strategy: strategyWeight.strategy,
    //         minWeight: strategyWeight.minWeight,
    //         targetWeight: strategyWeight.targetWeight,
    //         maxWeight: strategyWeight.maxWeight,
    //         riskFactor: strategyWeight.riskFactor,
    //         enabled: strategyWeight.enabled,
    //         enabledReward: strategyWeight.enabledReward
    //     })
    // }


    // // console.log(strategyWeights)
    // for (const strategyWeight of strategyWeightsCorrected) {
    //     if (strategyWeight.targetWeight.toString() == "0") {
    //         continue
    //     }

    //     if (strategyWeight.strategy == "0x0Ce0262Dc2DF64991E3d5AF163175065c1000b86") {
    //         strategyWeight.targetWeight = new BigNumber.from(0)
    //     }
    //     if (strategyWeight.strategy == "0xF4e58b63FD822E6543245128a42fE8Ad22db161d") {
    //         currentTargetWeight = strategyWeight.targetWeight.toString()
    //         console.log(currentTargetWeight)
    //         strategyWeight.targetWeight = (new BigNumber.from(currentTargetWeight)).add('20000')
    //     }
    //     console.log({
    //         strategy: strategyWeight.strategy,
    //         targetWeight: strategyWeight.targetWeight.toString(),

    //     })
    // }


    // await (await pm.setStrategyWeights(strategyWeightsCorrected)).wait();

    // let addresses = [];
    // let values = [];
    // let abis = [];




    // addresses.push(pm.address);
    // values.push(0);
    // abis.push(pm.interface.encodeFunctionData('removeStrategy', ['0x0Ce0262Dc2DF64991E3d5AF163175065c1000b86']));

    // addresses.push(pm.address);
    // values.push(0);
    // abis.push(pm.interface.encodeFunctionData('addStrategy', ['0x413C0f086A9A571E000D8d97053568368777907F']));


    // await testProposal(addresses, values, abis);

    // strategyWeights = await pm.getAllStrategyWeights();
    // strategyWeightsCorrected = []
    // for (const strategyWeight of strategyWeights) {
    //     strategyWeightsCorrected.push({
    //         strategy: strategyWeight.strategy,
    //         minWeight: strategyWeight.minWeight,
    //         targetWeight: strategyWeight.targetWeight,
    //         maxWeight: strategyWeight.maxWeight,
    //         riskFactor: strategyWeight.riskFactor,
    //         enabled: strategyWeight.enabled,
    //         enabledReward: strategyWeight.enabledReward
    //     })
    // }


    // // console.log(strategyWeights)
    // for (const strategyWeight of strategyWeightsCorrected) {
    //     // if (strategyWeight.targetWeight.toString() == "0") {
    //     //     continue
    //     // }

    //     if (strategyWeight.strategy == "0x413C0f086A9A571E000D8d97053568368777907F") {
    //         strategyWeight.targetWeight = new BigNumber.from('20000')
    //         strategyWeight.maxWeight = new BigNumber.from('100000')
    //     }
    //     if (strategyWeight.strategy == "0xF4e58b63FD822E6543245128a42fE8Ad22db161d") {
    //         currentTargetWeight = strategyWeight.targetWeight.toString()
    //         console.log(currentTargetWeight)
    //         strategyWeight.targetWeight = (new BigNumber.from(currentTargetWeight)).sub('20000')
    //     }
    //     console.log({
    //         strategy: strategyWeight.strategy,
    //         targetWeight: strategyWeight.targetWeight.toString()
    //     })
    // }

    // await (await pm.setStrategyWeights(strategyWeightsCorrected)).wait();

    // await showM2M();

    // await createProposal(addresses, values, abis);

    // await showM2M();
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });