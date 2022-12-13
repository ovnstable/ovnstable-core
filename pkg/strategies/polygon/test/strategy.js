const {POLYGON} = require('@overnight-contracts/common/utils/assets');
const {strategyTest} = require('@overnight-contracts/common/utils/strategy-test');

const IController = require("./abi/tetu/IController.json");
const MasterMerkat = require("./abi/mmf/MasterMerkat.json");
const HedgeExchanger = require("./abi/ets/HedgeExchanger.json");

const hre = require("hardhat");
let ethers = hre.ethers;

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
        name: 'StrategyMeshSwapUsdcUsdt',
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
    {
        name: 'StrategySynapseUsdc',
        enabledReward: true,
    },
    {
        name: 'StrategyStargateUsdc',
        enabledReward: true,
    },
    {
        name: 'StrategyStargateUsdt',
        enabledReward: true,
    },
    {
        name: 'StrategyDystopiaUsdcTusd',
        enabledReward: true,
    },
    {
        name: 'StrategyMMFUsdcUsdt',
        enabledReward: true,
        isRunStrategyLogic: true
    },
    {
        name: 'StrategyClearpoolUsdc',
        enabledReward: true,
    },
    {
        name: 'StrategyKyberSwapUsdcUsdt',
        enabledReward: true,
    },
    {
        name: 'StrategyQuickSwapV3UsdcUsdt',
        enabledReward: true,
        doubleStakeReward: true,
        doubleFarm: true,
    },
    {
        name: 'StrategyGainsDai',
        unstakeDelay:  10 * 60 * 60 * 1000,
        unstakePercent: 20, // Gains allow unstake only 20% amounts per 24 hours
        enabledReward: false // Rewards word only onchain - need trade transactions
    },
    {
        name: 'StrategyKyberSwapUsdcDai',
        enabledReward: true
    },
    {
        name: 'StrategyEtsAlfa',
        enabledReward: false,
        isRunStrategyLogic: true,
    },
    {
        name: 'StrategyEtsBeta',
        enabledReward: false,
        isRunStrategyLogic: true,
    },
    {
        name: 'StrategyEtsGamma',
        enabledReward: false,
        isRunStrategyLogic: true,
    },
    {
        name: 'StrategyEtsDelta',
        enabledReward: false,
        isRunStrategyLogic: true,
    },
    {
        name: 'StrategyEtsEpsilonPlus',
        enabledReward: false,
        isRunStrategyLogic: true,
    },
    {
        name: 'StrategyEtsZetaPlus',
        enabledReward: false,
        isRunStrategyLogic: true,
    },
    {
        name: 'StrategyEtsAlfaPlus',
        enabledReward: false,
        isRunStrategyLogic: true,
    },
    {
        name: 'StrategyEtsGammaPlus',
        enabledReward: false,
        isRunStrategyLogic: true,
    },
    {
        name: 'StrategyUniV3DaiUsdt',
        enabledReward: false,
        isRunStrategyLogic: true,
    },
    {
        name: 'StrategyBalancerUsdc',
        enabledReward: true,
    },
    {
        name: 'StrategyUniV3DaiUsdt',
        enabledReward: false,
        isRunStrategyLogic: true,
    }

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
    } else if (strategyName == 'StrategyMMFUsdcUsdt') {
        let ownerAddress = "0x61c20e2E1ded20856754321d585f7Ad28e4D6b27";
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [ownerAddress],
        });
        const owner = await ethers.getSigner(ownerAddress);
        let masterMerkat = await ethers.getContractAt(MasterMerkat, "0xa2B417088D63400d211A4D5EB3C4C5363f834764");
        await masterMerkat.connect(owner).setWhitelist(strategyAddress, true);
        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [ownerAddress],
        });
    } else if (strategyName == 'StrategyEtsAlfa') {
        let ownerAddress = "0x5CB01385d3097b6a189d1ac8BA3364D900666445";
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [ownerAddress],
        });
        const owner = await ethers.getSigner(ownerAddress);
        let hedgeExchanger = await ethers.getContractAt(HedgeExchanger, "0x4B6a705A26178f4693428526e86a48659dA44433");
        await hedgeExchanger.connect(owner).grantRole(await hedgeExchanger.FREE_RIDER_ROLE(), strategyAddress);
        await hedgeExchanger.connect(owner).grantRole(await hedgeExchanger.WHITELIST_ROLE(), strategyAddress);
        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [ownerAddress],
        });
    } else if (strategyName == 'StrategyEtsBeta') {
        let ownerAddress = "0x5CB01385d3097b6a189d1ac8BA3364D900666445";
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [ownerAddress],
        });
        const owner = await ethers.getSigner(ownerAddress);
        let hedgeExchanger = await ethers.getContractAt(HedgeExchanger, "0x025656862635b670FC62e4BaD9D20744258dbb02");
        await hedgeExchanger.connect(owner).grantRole(await hedgeExchanger.FREE_RIDER_ROLE(), strategyAddress);
        await hedgeExchanger.connect(owner).grantRole(await hedgeExchanger.WHITELIST_ROLE(), strategyAddress);
        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [ownerAddress],
        });
    } else if (strategyName == 'StrategyEtsGamma') {
        let ownerAddress = "0x5CB01385d3097b6a189d1ac8BA3364D900666445";
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [ownerAddress],
        });
        const owner = await ethers.getSigner(ownerAddress);
        let hedgeExchanger = await ethers.getContractAt(HedgeExchanger, "0xdD7e3823d9178CEFBB486b1c56Fd31EE7DcfF323");
        await hedgeExchanger.connect(owner).grantRole(await hedgeExchanger.FREE_RIDER_ROLE(), strategyAddress);
        await hedgeExchanger.connect(owner).grantRole(await hedgeExchanger.WHITELIST_ROLE(), strategyAddress);
        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [ownerAddress],
        });
    } else if (strategyName == 'StrategyEtsDelta') {
        let ownerAddress = "0x5CB01385d3097b6a189d1ac8BA3364D900666445";
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [ownerAddress],
        });
        const owner = await ethers.getSigner(ownerAddress);
        let hedgeExchanger = await ethers.getContractAt(HedgeExchanger, "0x4279474D4643269613ff1832ff9aD88077b4E67F");
        await hedgeExchanger.connect(owner).grantRole(await hedgeExchanger.FREE_RIDER_ROLE(), strategyAddress);
        await hedgeExchanger.connect(owner).grantRole(await hedgeExchanger.WHITELIST_ROLE(), strategyAddress);
        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [ownerAddress],
        });
    } else if (strategyName == 'StrategyEtsEpsilonPlus') {
        let ownerAddress = "0x5CB01385d3097b6a189d1ac8BA3364D900666445";
            await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [ownerAddress],
        });
        const owner = await ethers.getSigner(ownerAddress);
        let hedgeExchanger = await ethers.getContractAt(HedgeExchanger, "0xe63ae88251aaf0bc2ea4d3637D3131A294FD74d7");
        await hedgeExchanger.connect(owner).grantRole(await hedgeExchanger.FREE_RIDER_ROLE(), strategyAddress);
        await hedgeExchanger.connect(owner).grantRole(await hedgeExchanger.WHITELIST_ROLE(), strategyAddress);
        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [ownerAddress],
        });
    } else if (strategyName == 'StrategyEtsZetaPlus') {
        let ownerAddress = "0x5CB01385d3097b6a189d1ac8BA3364D900666445";
            await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [ownerAddress],
        });
        const owner = await ethers.getSigner(ownerAddress);
        let hedgeExchanger = await ethers.getContractAt(HedgeExchanger, "0xC5544e6C53AcDaC83876567f5D485d55cD03e72D");
        await hedgeExchanger.connect(owner).grantRole(await hedgeExchanger.FREE_RIDER_ROLE(), strategyAddress);
        await hedgeExchanger.connect(owner).grantRole(await hedgeExchanger.WHITELIST_ROLE(), strategyAddress);
        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [ownerAddress],
        });
    } else if (strategyName == 'StrategyEtsAlfaPlus') {
        let ownerAddress = "0x5CB01385d3097b6a189d1ac8BA3364D900666445";
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [ownerAddress],
        });
        const owner = await ethers.getSigner(ownerAddress);
        let hedgeExchanger = await ethers.getContractAt(HedgeExchanger, "0x910336883586354643295b47BeF69F4F470e3DFc");
        await hedgeExchanger.connect(owner).grantRole(await hedgeExchanger.FREE_RIDER_ROLE(), strategyAddress);
        await hedgeExchanger.connect(owner).grantRole(await hedgeExchanger.WHITELIST_ROLE(), strategyAddress);
        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [ownerAddress],
        });
    } else if (strategyName == 'StrategyEtsGammaPlus') {
        let ownerAddress = "0x5CB01385d3097b6a189d1ac8BA3364D900666445";
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [ownerAddress],
        });
        const owner = await ethers.getSigner(ownerAddress);
        let hedgeExchanger = await ethers.getContractAt(HedgeExchanger, "0x19c8E2c8dF3273c0F94df301d468Ee870860Bd9e");
        await hedgeExchanger.connect(owner).grantRole(await hedgeExchanger.FREE_RIDER_ROLE(), strategyAddress);
        await hedgeExchanger.connect(owner).grantRole(await hedgeExchanger.WHITELIST_ROLE(), strategyAddress);
        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [ownerAddress],
        });
    }
}

describe("Polygon", function () {

    arrays.forEach(value => {
        strategyTest(value, 'POLYGON', 'usdc', runStrategyLogic);
    })
});
