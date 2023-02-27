const {strategyTest} = require('@overnight-contracts/common/utils/strategy-test');
const {impersonatingEtsGrantRole} = require("@overnight-contracts/common/utils/tests");

let id = process.env.TEST_STRATEGY;

let arrays = [
    {
        name: 'StrategyAave',
        enabledReward: false,
    },
    {
        name: 'StrategyEtsAlpha',
        enabledReward: false,
        isRunStrategyLogic: true

    },
    {
        name: 'StrategyEtsBeta',
        enabledReward: false,
        isRunStrategyLogic: true
    },
    {
        name: 'StrategyEtsGamma',
        enabledReward: false,
        isRunStrategyLogic: true
    },
    {
        name: 'StrategyAaveDai',
        enabledReward: false,
        isRunStrategyLogic: false
    },
];

if (id !== undefined && id !== "") {
    console.log(`Strategy ID ${id}`);
    arrays = arrays.filter(value => value.name === id);
}

console.log(`Run tests [${arrays.map(value => value.name)}]`);

async function runStrategyLogic(strategyName, strategyAddress) {

    if (strategyName === 'StrategyEtsAlpha') {
        await impersonatingEtsGrantRole('0x21b3D1A8B09374a890E3Eb8139E60B21D01490Da', '0x5CB01385d3097b6a189d1ac8BA3364D900666445', strategyAddress)
    } else if (strategyName === 'StrategyEtsBeta') {
        await impersonatingEtsGrantRole('0x92FC104f8b42c7dCe5Be9BE29Bfb82d2f9D96855', '0x5CB01385d3097b6a189d1ac8BA3364D900666445', strategyAddress)
    } else if (strategyName === 'StrategyEtsGamma') {
        await impersonatingEtsGrantRole('0xc2c84ca763572c6aF596B703Df9232b4313AD4e3', '0x5CB01385d3097b6a189d1ac8BA3364D900666445', strategyAddress)
    }
}

describe("ARBITRUM", function () {
    arrays.forEach(value => {
        switch (process.env.STAND) {
            case 'arbitrum_dai':
                strategyTest(value, 'ARBITRUM', 'dai', runStrategyLogic);
                break;
            default:
                strategyTest(value, 'ARBITRUM', 'usdc', runStrategyLogic);
                break;
        }
    })
});
