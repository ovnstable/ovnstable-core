const hre = require("hardhat");
const { getContract } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus } = require("@overnight-contracts/common/utils/governance");
const { COMMON, BLAST } = require('@overnight-contracts/common/utils/assets');

const path = require('path');

let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

const OPERATIONS = {
    REINVEST : 0,
    SEND : 1,
    CUSTOM: 2
}

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    const SwapSimulatorThruster = await getContract('SwapSimulatorThruster');
    const newSwapSimulatorThrusterImpl = "0x6F5900b4Ce219d148730Ba7C5Ce1F4636353CCC3";

    const StrategyThrusterSwap = await getContract('StrategyThrusterSwap');
    const newThrusterSwapImpl = "0x9C57041D88942aa3148EB8ff1F01589bDeB1642B";

    addProposalItem(SwapSimulatorThruster, "upgradeTo", [newSwapSimulatorThrusterImpl]);
    addProposalItem(StrategyThrusterSwap, "upgradeTo", [newThrusterSwapImpl]);
    addProposalItem(StrategyThrusterSwap, 'setParams', [await getParams()]);
    addProposalItem(StrategyThrusterSwap, 'setClaimConfig', [await getConfig()]);


    // await testProposal(addresses, values, abis);

    // await testUsdPlus(filename, 'blast');
    // await testUsdPlus(filename, 'blast_usdc');

    await createProposal(filename, addresses, values, abis);

    function addProposalItem(contract, methodName, params) {
        addresses.push(contract.address);
        values.push(0);
        abis.push(contract.interface.encodeFunctionData(methodName, params));
    }
}

async function getParams() {
    return {
        pool: '0x147e7416d5988b097b3a1859efecc2c5e04fdf96',
        swapSimulatorAddress: "0x0777Cdf187782832c9D98c0aB73cCdc19D271B54", 
        npmAddress: '0x434575eaea081b735c985fa9bf63cd7b87e227f9', 
        nfpBooster: '0xAd21b2055974075Ab3E126AC5bF8d7Ee3Fcd848a',

        poolUsdbWeth: '0xf00DA13d2960Cf113edCef6e3f30D92E52906537',
        poolWethHyper: '0xE16fbfcFB800E358De6c3210e86b5f23Fc0f2598',
        poolWethThrust: '0x878C963776F374412C896e4B2a3DB84A36614c7C',

        hyperTokenAddress: BLAST.hyper,
        thrustTokenAddress: BLAST.thrust,
        wethTokenAddress: BLAST.weth,

        lowerTick: -1,
        upperTick: 0,
        binSearchIterations: 20,
        rewardSwapSlippageBP: 500,
        liquidityDecreaseDeviationBP: 500
    };
}

async function getConfig() {
    return {
        operation: OPERATIONS.SEND,
        beneficiary: COMMON.rewardWallet,
        distributor: "0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae",
        __gap: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    };
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
