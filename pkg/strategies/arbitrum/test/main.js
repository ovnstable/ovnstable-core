const {ARBITRUM} = require('@overnight-contracts/common/utils/assets');
const {strategyTest} = require('@overnight-contracts/common/utils/strategy-test');
const {transferETH} = require("@overnight-contracts/common/utils/script-utils");

const HedgeExchanger = require("./abi/ets/HedgeExchanger.json");

let id = process.env.TEST_STRATEGY;

let arrays = [
    {
        name: 'StrategyAave',
        enabledReward: false,
    },
];

if (id !== undefined && id !== "") {
    console.log(`Strategy ID ${id}`);
    arrays = arrays.filter(value => value.name === id);
}

console.log(`Run tests [${arrays.map(value => value.name)}]`);

async function runStrategyLogic(strategyName, strategyAddress) {
}

describe("ARBITRUM", function () {
    arrays.forEach(value => {
        strategyTest(value, 'ARBITRUM', 'usdc', runStrategyLogic);
    })
});
