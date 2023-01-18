const {OPTIMISM, BSC} = require('@overnight-contracts/common/utils/assets');
const {strategyTest} = require('@overnight-contracts/common/utils/strategy-test');
const {transferETH} = require("@overnight-contracts/common/utils/script-utils");

const ReaperSonneUsdc = require("./abi/reaper/ReaperSonneUsdc.json");
const ReaperSonneDai = require("./abi/reaper/ReaperSonneDai.json");
const ReaperSonneUsdt = require("./abi/reaper/ReaperSonneUsdt.json");
const HedgeExchanger = require("./abi/ets/HedgeExchanger.json");

let id = process.env.TEST_STRATEGY;

let arrays = [
    {
        name: 'StrategyAave',
        enabledReward: true,
    },
    {
        name: 'StrategySynapseUsdc',
        enabledReward: true,
    },
    {
        name: 'StrategyVelodromeUsdcWeth',
        enabledReward: true,
    },
    {
        name: 'StrategyRubiconUsdc',
        enabledReward: true,
    },
    {
        name: 'StrategyPikaUsdc',
        enabledReward: true,
        unstakeDelay:  60 * 60 * 1000
    },
    {
        name: 'StrategyRubiconDai',
        enabledReward: true,
    },

    {
        name: 'StrategyRubiconUsdt',
        enabledReward: true,
    },
    {
        name: 'StrategyAaveDai',
        enabledReward: true,
    },
    {
        name: 'StrategyBeethovenxUsdc',
        enabledReward: true,
    },
    {
        name: 'StrategyReaperSonneUsdc',
        enabledReward: false,
        isRunStrategyLogic: true
    },
    {
        name: 'StrategyReaperSonneDai',
        enabledReward: false,
        isRunStrategyLogic: true
    },
    {
        name: 'StrategyReaperSonneUsdt',
        enabledReward: false,
        isRunStrategyLogic: true
    },
    {
        name: 'StrategyUsdPlusDai',
        enabledReward: false,
    },
    {
        name: 'StrategyArrakisUsdcDai',
        enabledReward: true,
    },
    {
        name: 'StrategyArrakisDaiUsdc',
        enabledReward: true,
    },
    {
        name: 'StrategyReaperSonneDaiDai',
        enabledReward: false,
        isRunStrategyLogic: true
    },
    {
        name: 'StrategyGammaUsdcDai',
        enabledReward: true,
    },
    {
        name: 'StrategyEtsBetaPlus',
        enabledReward: false,
        isRunStrategyLogic: true,
    },
    {
        name: 'StrategyBeethovenxSonne',
        enabledReward: true,
        isRunStrategyLogic: true,
    },
    {
        name: 'StrategyEtsAlphaPlus',
        enabledReward: false,
        isRunStrategyLogic: true,
    },
    {
        name: 'StrategyEtsDelta',
        enabledReward: false,
        isRunStrategyLogic: true,
    },
    {
        name: 'StrategyEtsGamma',
        enabledReward: false,
        isRunStrategyLogic: true,
    },
];

if (id !== undefined && id !== "") {
    console.log(`Strategy ID ${id}`);
    arrays = arrays.filter(value => value.name === id);
}

console.log(`Run tests [${arrays.map(value => value.name)}]`);

async function runStrategyLogic(strategyName, strategyAddress) {
    if (strategyName == 'StrategyReaperSonneUsdc') {
        let governanceAddress = "0x9BC776dBb134Ef9D7014dB1823Cd755Ac5015203";
        await transferETH(1, governanceAddress);
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [governanceAddress],
        });
        const governance = await ethers.getSigner(governanceAddress);
        let reaperSonneUsdc = await ethers.getContractAt(ReaperSonneUsdc, "0x566c68Cd2f1e8b6D780c342B207B60c9c4f32767");
        await reaperSonneUsdc.connect(governance).updateSecurityFee(0);
        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [governanceAddress],
        });
    } else if (strategyName == 'StrategyReaperSonneDai' || strategyName == 'StrategyReaperSonneDaiDai') {
        let governanceAddress = "0x9BC776dBb134Ef9D7014dB1823Cd755Ac5015203";
        await transferETH(1, governanceAddress);
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [governanceAddress],
        });
        const governance = await ethers.getSigner(governanceAddress);
        let reaperSonneDai = await ethers.getContractAt(ReaperSonneDai, "0x071A922d81d604617AD5276479146bF9d7105EFC");
        await reaperSonneDai.connect(governance).updateSecurityFee(0);
        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [governanceAddress],
        });
    } else if (strategyName == 'StrategyReaperSonneUsdt') {
        let governanceAddress = "0x9BC776dBb134Ef9D7014dB1823Cd755Ac5015203";
        await transferETH(1, governanceAddress);
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [governanceAddress],
        });
        const governance = await ethers.getSigner(governanceAddress);
        let reaperSonneUsdt = await ethers.getContractAt(ReaperSonneUsdt, "0xcF14ef7C69166847c71913dc449c3958F55998d7");
        await reaperSonneUsdt.connect(governance).updateSecurityFee(0);
        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [governanceAddress],
        });
    } else if (strategyName == 'StrategyEtsBetaPlus') {
        let ownerAddress = "0x5CB01385d3097b6a189d1ac8BA3364D900666445";
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [ownerAddress],
        });
        const owner = await ethers.getSigner(ownerAddress);
        let hedgeExchanger = await ethers.getContractAt(HedgeExchanger, "0xFAc722133a19D38833cc105b1349715717CF050E");
        await hedgeExchanger.connect(owner).grantRole(await hedgeExchanger.FREE_RIDER_ROLE(), strategyAddress);
        await hedgeExchanger.connect(owner).grantRole(await hedgeExchanger.WHITELIST_ROLE(), strategyAddress);
        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [ownerAddress],
        });
    } else if (strategyName == 'StrategyEtsAlphaPlus') {
        let ownerAddress = "0x5CB01385d3097b6a189d1ac8BA3364D900666445";
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [ownerAddress],
        });
        const owner = await ethers.getSigner(ownerAddress);
        let hedgeExchanger = await ethers.getContractAt(HedgeExchanger, "0x7f947D141FED32595916E150740a5e60d479E95F");
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
        let hedgeExchanger = await ethers.getContractAt(HedgeExchanger, "0xb9a141545295c26d78E3C87E804befE69D029De5");
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
        let hedgeExchanger = await ethers.getContractAt(HedgeExchanger, "0xB7FF28a21b9daf2f9F0136601098E66c49D32510");
        await hedgeExchanger.connect(owner).grantRole(await hedgeExchanger.FREE_RIDER_ROLE(), strategyAddress);
        await hedgeExchanger.connect(owner).grantRole(await hedgeExchanger.WHITELIST_ROLE(), strategyAddress);
        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [ownerAddress],
        });
    }
}

describe("OPTIMISM", function () {
    arrays.forEach(value => {

        switch (process.env.STAND) {
            case 'optimism_dai':
                strategyTest(value, 'OPTIMISM', 'dai', runStrategyLogic);
                break;
            default:
                strategyTest(value, 'OPTIMISM', 'usdc', runStrategyLogic);
                break;
        }
    })
});
