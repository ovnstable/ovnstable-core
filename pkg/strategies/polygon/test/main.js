const {POLYGON} = require('@overnight-contracts/common/utils/assets');
const {strategyTest} = require('@overnight-contracts/common/utils/strategy-test');

const IController = require("./abi/tetu/IController.json");

let id = process.env.TEST_STRATEGY;

let arrays = [

    {
        name: 'StrategyAave',
        enabledReward: false,
        isRunStrategyLogic: false,
    },
    {
        name: 'StrategyBalancer',
        enabledReward: true,
        isRunStrategyLogic: false,
    },
    {
        name: 'StrategyCurve',
        enabledReward: false,
        isRunStrategyLogic: false,
    },
    {
        name: 'StrategyDodoUsdc',
        enabledReward: true,
        isRunStrategyLogic: false,
    },
    {
        name: 'StrategyDodoUsdt',
        enabledReward: true,
        isRunStrategyLogic: false,
    },
    {
        name: 'StrategyIdle',
        enabledReward: false,
        isRunStrategyLogic: false,
    },
    {
        name: 'StrategyImpermaxQsUsdt',
        enabledReward: false,
        isRunStrategyLogic: false,
    },
    {
        name: 'StrategyMStable',
        enabledReward: true,
        isRunStrategyLogic: false,
    },
    {
        name: 'StrategyIzumi',
        enabledReward: true,
        isRunStrategyLogic: false,
    },
    {
        name: 'StrategyArrakis',
        enabledReward: true,
        isRunStrategyLogic: false,
    },
    {
        name: 'StrategyMeshSwapUsdc',
        enabledReward: true,
        isRunStrategyLogic: false,
    },
    {
        name: 'StrategyTetuUsdc',
        enabledReward: true,
        isRunStrategyLogic: true,
    },
    {
        name: 'StrategyArrakisWeth',
        enabledReward: true,
    },
    {
        name: 'StrategyArrakisUsdt',
        enabledReward: true,
    },
    {
        name: 'StrategyArrakisWmatic',
        enabledReward: true,
    },
    {
        name: 'StrategyMeshSwapUsdcUsdt',
        enabledReward: true,
    },
    {
        name: 'StrategyBorrowMeshSwapUsdcUsdt',
        enabledReward: true,
    },
    {
        name: 'StrategyDystopiaUsdcUsdt',
        enabledReward: true,
    },
    {
        name: 'StrategyDystopiaUsdcDai',
        enabledReward: true,
    },
    
];


if (id !== undefined && id !== "") {
    console.log(`Strategy ID ${id}`);
    arrays = arrays.filter(value => value.name === id);
}

console.log(`Run tests [${arrays.map(value => value.name)}]`);

async function runStrategyLogic(strategyName, strategyAddress) {

    if (strategyName == 'StrategyTetuUsdc') {
        let governanceAddress = "0xcc16d636dD05b52FF1D8B9CE09B09BC62b11412B";
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [governanceAddress],
        });
        const governance = await ethers.getSigner(governanceAddress);
        let controller = await ethers.getContractAt(IController, "0x6678814c273d5088114B6E40cC49C8DB04F9bC29");
        await controller.connect(governance).changeWhiteListStatus([strategyAddress], true);
        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [governanceAddress],
        });
    }
}

describe("Polygon", function () {

    arrays.forEach(value => {
        strategyTest(value, 'POLYGON', POLYGON, runStrategyLogic);
    })
});
