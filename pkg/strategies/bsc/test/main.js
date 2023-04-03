const {BSC} = require('@overnight-contracts/common/utils/assets');
const {strategyTest} = require('@overnight-contracts/common/utils/strategy-test');
const {getContract, transferETH} = require("@overnight-contracts/common/utils/script-utils");
const hre = require('hardhat');
const ethers = hre.ethers;

const HedgeExchanger = require("./abi/ets/HedgeExchanger.json");

let id = process.env.TEST_STRATEGY;

let arrays = [
    {
        name: 'StrategyVenusBusd',
        enabledReward: false,
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
    {
        name: 'StrategyVenusUsdc',
        enabledReward: true,
    },
    {
        name: 'StrategyVenusUsdt',
        enabledReward: true,
    },
    {
        name: 'StrategyEtsAlphaUsdt',
        enabledReward: false,
        isRunStrategyLogic: true,
    },
    {
        name: 'StrategyUsdPlusUsdt',
        enabledReward: false,
        isRunStrategyLogic: true,
    },
    {
        name: 'StrategyWombexUsdt',
        enabledReward: true,
    },
];

if (id !== undefined && id !== "") {
    console.log(`Strategy ID ${id}`);
    arrays = arrays.filter(value => value.name === id);
}

console.log(`Run tests [${arrays.map(value => value.name)}]`);

async function runStrategyLogic(strategyName, strategyAddress) {

    if (strategyName == 'StrategyEtsAlpha' || strategyName == 'StrategyEtsAlphaUsdt') {
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

    } else if (strategyName == 'StrategyUsdPlusUsdt') {
        let ownerAddress = "0xe497285e466227F4E8648209E34B465dAA1F90a0";
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [ownerAddress],
        });
        await transferETH(1, ownerAddress);
        const owner = await ethers.getSigner(ownerAddress);
        let exchange = await getContract("Exchange", "bsc");
        await exchange.connect(owner).grantRole(await exchange.FREE_RIDER_ROLE(), strategyAddress);
        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [ownerAddress],
        });
    }
}

describe("BSC", function () {
    arrays.forEach(value => {
        switch (process.env.STAND) {
            case "bsc_usdt":
                strategyTest(value, 'BSC', 'usdt', runStrategyLogic);
                break;
            default:
                strategyTest(value, 'BSC', 'usdc', runStrategyLogic);
                break;
        }
    })
});
