const {strategyTest} = require('@overnight-contracts/common/utils/strategy-test');
const {impersonatingEtsGrantRole, prepareEnvironment, impersonatingStaker} = require("@overnight-contracts/common/utils/tests");
const {execTimelock, getContract} = require("@overnight-contracts/common/utils/script-utils");
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");

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
    {
        name: 'StrategyUsdPlusDai',
        enabledReward: false,
        isRunStrategyLogic: true
    },
    {
        name: 'StrategySterlingUsdcUsdt',
        enabledReward: true,
        isRunStrategyLogic: false
    },
    {
        name: 'StrategySolidlizardUsdcDai',
        enabledReward: true,
        isRunStrategyLogic: true
    },
    {
        name: 'StrategyWombatUsdc',
        enabledReward: true,
        isRunStrategyLogic: false
    }
];

if (id !== undefined && id !== "") {
    console.log(`Strategy ID ${id}`);
    arrays = arrays.filter(value => value.name === id);
}

console.log(`Run tests [${arrays.map(value => value.name)}]`);

async function runStrategyLogic(strategyName, strategyAddress) {

    await prepareEnvironment();

    let ownerAddress = '0x5CB01385d3097b6a189d1ac8BA3364D900666445';
    if (strategyName === 'StrategyEtsAlpha') {
        await impersonatingEtsGrantRole('0x21b3D1A8B09374a890E3Eb8139E60B21D01490Da', ownerAddress, strategyAddress)
    } else if (strategyName === 'StrategyEtsBeta') {
        await impersonatingEtsGrantRole('0x92FC104f8b42c7dCe5Be9BE29Bfb82d2f9D96855', ownerAddress, strategyAddress)
    } else if (strategyName === 'StrategyEtsGamma') {
        await impersonatingEtsGrantRole('0xc2c84ca763572c6aF596B703Df9232b4313AD4e3', ownerAddress, strategyAddress)
    }else if (strategyName === 'StrategySolidlizardUsdcDai'){

        let gauge = '0x884c28296b6ec728ac27bfe7579419709514d154';
        let pair = '0x07d7F291e731A41D3F0EA4F1AE5b6d920ffb3Fe0';
        await impersonatingStaker("0x8c851D48D9CE7c8A78cF633ED2b153960282B49D", ownerAddress, strategyAddress, pair, gauge)
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
