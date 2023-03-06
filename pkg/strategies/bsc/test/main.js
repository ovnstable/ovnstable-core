const {BSC} = require('@overnight-contracts/common/utils/assets');
const {strategyTest} = require('@overnight-contracts/common/utils/strategy-test');

const HedgeExchanger = require("./abi/ets/HedgeExchanger.json");

let id = process.env.TEST_STRATEGY;

let arrays = [
    {
        name: 'StrategyVenusBusd',
        enabledReward: true,
    },
    {
        name: 'StrategyStargateBusd',
        enabledReward: true,
    },
    {
        name: 'StrategySynapseBusd',
        enabledReward: true,
    },
    {
        name: 'StrategyVenusUsdc',
        enabledReward: false,
    },
    {
        name: 'StrategySynapseUsdc',
        enabledReward: true,
    },
    {
        name: 'StrategyVenusUsdt',
        enabledReward: false,
    },
    {
        name: 'StrategyStargateUsdt',
        enabledReward: true,
    },
    {
        name: 'StrategySynapseUsdt',
        enabledReward: true,
    },
    {
        name: 'StrategyConeBusdUsdc',
        enabledReward: true,
    },
    {
        name: 'StrategyConeBusdUsdt',
        enabledReward: false,
    },
    {
        name: 'StrategyUnknownBusdUsdc',
        enabledReward: true,
    },
    {
        name: 'StrategyUnknownBusdUsdt',
        enabledReward: false,
    },
    {
        name: 'StrategyConeBusdUsdtUsdc',
        enabledReward: true,
    },
    {
        name: 'StrategyConeBusdTusd',
        enabledReward: true,
    },
    {
        name: 'StrategyUnknownBusdTusd',
        enabledReward: true,
    },
    {
        name: 'StrategyAequinoxBusdUsdcUsdt',
        enabledReward: true,
        delay: 60 * 60 * 1000,
    },
    {
        name: 'StrategyWombatBusd',
        enabledReward: true,
    },
    {
        name: 'StrategyWombatBusdUsdc',
        enabledReward: true,
    },
    {
        name: 'StrategyWombexBusd',
        enabledReward: true,
    },
    {
        name: 'StrategyWombexUsdc',
        enabledReward: true,
    },
    {
        name: 'StrategyWombexUsdt',
        enabledReward: true,
    },
    {
        name: 'StrategyThenaBusdUsdt',
        enabledReward: true,
    },
    {
        name: 'StrategyThenaBusdUsdc',
        enabledReward: true,
    },
    {
        name: 'StrategyEtsAlpha',
        enabledReward: false,
        isRunStrategyLogic: true,
    },
    {
        name: 'StrategyEllipsisDotDotBusd',
        enabledReward: true,
    },
];

if (id !== undefined && id !== "") {
    console.log(`Strategy ID ${id}`);
    arrays = arrays.filter(value => value.name === id);
}

console.log(`Run tests [${arrays.map(value => value.name)}]`);

async function runStrategyLogic(strategyName, strategyAddress) {
    if (strategyName == 'StrategyEtsAlpha') {
        let ownerAddress = "0x5CB01385d3097b6a189d1ac8BA3364D900666445";
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [ownerAddress],
        });
        const owner = await ethers.getSigner(ownerAddress);
        let hedgeExchanger = await ethers.getContractAt(HedgeExchanger, "0x65AfD05fbc4413948ffaaD8bCb13f71b6f79332D");
        await hedgeExchanger.connect(owner).grantRole(await hedgeExchanger.FREE_RIDER_ROLE(), strategyAddress);
        await hedgeExchanger.connect(owner).grantRole(await hedgeExchanger.WHITELIST_ROLE(), strategyAddress);
        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [ownerAddress],
        });
    }
}

describe("BSC", function () {
    arrays.forEach(value => {
        switch (process.env.STAND) {
            default:
                strategyTest(value, 'BSC', 'busd', runStrategyLogic);
                break;
        }
    })
});
