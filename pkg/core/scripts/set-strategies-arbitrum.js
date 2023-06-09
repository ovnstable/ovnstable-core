const {
    getContract,
    changeWeightsAndBalance,
    execTimelock,
    initWallet,
    convertWeights,
    showM2M
} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");

async function main() {

    let weights = [{
        "strategy": "0x6389D1F4B50f06c19a63A8F80BC67804F5D77E5d",
        "name": "Aave",
        "minWeight": 0,
        "targetWeight": 0.4,
        "riskFactor": 0,
        "maxWeight": 100,
        "enabled": false,
        "enabledReward": true
    }, {
        "strategy": "0x908080Ed6b88D6A1a80593dbE0FC2064d38ef78f",
        "name": "BetaArb",
        "minWeight": 0,
        "targetWeight": 0,
        "riskFactor": 0,
        "maxWeight": 100,
        "enabled": false,
        "enabledReward": false
    }, {
        "strategy": "0x0F4588ea1094663529Dd6e9f846e6F874A95521C",
        "name": "ETS Alpha",
        "minWeight": 0,
        "targetWeight": 0,
        "riskFactor": 0,
        "maxWeight": 100,
        "enabled": false,
        "enabledReward": false
    }, {
        "strategy": "0xb27Eef1F935E1BA89EE51A433f9897540301b933",
        "name": "ZetaArb",
        "minWeight": 0,
        "targetWeight": 16.6,
        "riskFactor": 0,
        "maxWeight": 100,
        "enabled": false,
        "enabledReward": false
    }, {
        "strategy": "0xfdEf7b3f513a24444f38C1E348EFA2EBB8EB20d9",
        "name": "Wombat USDC",
        "minWeight": 0,
        "targetWeight": 3,
        "riskFactor": 0,
        "maxWeight": 100,
        "enabled": false,
        "enabledReward": true
    }, {
        "strategy": "0xE190f0cEdF783D67B4F1C7dFaca04683f1D13c25",
        "name": "Wombat USDT",
        "minWeight": 0,
        "targetWeight": 2.3,
        "riskFactor": 0,
        "maxWeight": 100,
        "enabled": false,
        "enabledReward": true
    }, {
        "strategy": "0xb73a962205D00E28DB4B5A400DF7E35355b61CA6",
        "name": "Wombat USD+ (OVN)",
        "minWeight": 0,
        "targetWeight": 9.3,
        "riskFactor": 0,
        "maxWeight": 100,
        "enabled": false,
        "enabledReward": true
    }, {
        "strategy": "0xacc03BFf8E3dc8762012c0c76220171eD15B6Bf1",
        "name": "Chronos USDC/DAI",
        "minWeight": 0,
        "targetWeight": 0,
        "riskFactor": 0,
        "maxWeight": 0,
        "enabled": false,
        "enabledReward": false
    }, {
        "strategy": "0x2590712b9a4fD877D0d0be24f8C418049a011221",
        "name": "Chronos USDC/USDT",
        "minWeight": 0,
        "targetWeight": 0,
        "riskFactor": 0,
        "maxWeight": 100,
        "enabled": false,
        "enabledReward": false
    }, {
        "strategy": "0x4a1c89c30DA16F0B298FfE3697390Cd39BFC9ba0",
        "name": "DeltaArb",
        "minWeight": 0,
        "targetWeight": 18.3,
        "riskFactor": 0,
        "maxWeight": 100,
        "enabled": false,
        "enabledReward": false
    }, {
        "strategy": "0x307418340F5991CD895CA0Fc4Eba04995e9BE861",
        "name": "EtaArb",
        "minWeight": 0,
        "targetWeight": 1.4,
        "riskFactor": 0,
        "maxWeight": 100,
        "enabled": false,
        "enabledReward": false
    }, {
        "strategy": "0xe105d6313ABa69E88255dEf71EAf2E53939D567e",
        "name": "BlackHole",
        "minWeight": 0,
        "targetWeight": 0.7,
        "riskFactor": 0,
        "maxWeight": 100,
        "enabled": false,
        "enabledReward": false
    }, {
        "strategy": "0x0942A9b95D44218f8F741B3A6aF9063517E1cbed",
        "name": "Magpie USDC",
        "minWeight": 0,
        "targetWeight": 14.2,
        "riskFactor": 0,
        "maxWeight": 100,
        "enabled": true,
        "enabledReward": true
    }, {
        "strategy": "0x18Fe5Bf2ee78d677EDf4d59017CBE6CB9F68fae8",
        "name": "Magpie USD+",
        "minWeight": 0,
        "targetWeight": 0,
        "riskFactor": 0,
        "maxWeight": 0,
        "enabled": false,
        "enabledReward": false
    }, {
        "strategy": "0x7f4f84c02E63A83E52e48B60eec33C1Fe6700E57",
        "name": "KappaArb",
        "minWeight": 0,
        "targetWeight": 5.5,
        "riskFactor": 0,
        "maxWeight": 100,
        "enabled": false,
        "enabledReward": false
    }, {
        "strategy": "0x9b7422Be8b1D6A8eb12AfdE20604eaE087e4688e",
        "name": "MuArb",
        "minWeight": 0,
        "targetWeight": 5.8,
        "riskFactor": 0,
        "maxWeight": 100,
        "enabled": false,
        "enabledReward": false
    }, {
        "strategy": "0x7dA4F46A9DDFEb4452AB68fda34D37fAb39f4071",
        "name": "Pendle USDC/USDT",
        "minWeight": 0,
        "targetWeight": 22,
        "riskFactor": 0,
        "maxWeight": 100,
        "enabled": true,
        "enabledReward": true
    }, {
        "strategy": "0x7e58bdCa6D042cdA69De08b7B0F32E7d41A33d62",
        "name": "LambdaArb",
        "minWeight": 0,
        "targetWeight": 0.5,
        "riskFactor": 0,
        "maxWeight": 100,
        "enabled": false,
        "enabledReward": false
    }, {
        "strategy": "0x4865446faf5c97Ac1b0E3D2994545cF51c03c017",
        "name": "Magpie USDT",
        "minWeight": 0,
        "targetWeight": 0,
        "riskFactor": 0,
        "maxWeight": 100,
        "enabled": false,
        "enabledReward": false
    }, {
        "strategy": "0x4eCCcAc6458E2Cc945ce7700a28000C4e82B2b6c",
        "name": "ETS Nu",
        "minWeight": 0,
        "targetWeight": 0,
        "riskFactor": 0,
        "maxWeight": 0,
        "enabled": false,
        "enabledReward": false
    }]


    weights = await convertWeights(weights);


    await execTimelock(async (timelock) => {
        let pm = await getContract('PortfolioManager');

        await showM2M();

        weights = await convertWeights(weights);

        await pm.connect(timelock).grantRole(await pm.PORTFOLIO_AGENT_ROLE(), timelock.address);
        // await pm.connect(timelock).setStrategyWeights(weights);
        await pm.connect(timelock).balance();

        await showM2M();

    });


    // await changeWeightsAndBalance(weights);

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

