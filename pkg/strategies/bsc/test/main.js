const {BSC} = require('@overnight-contracts/common/utils/assets');
const {strategyTest} = require('@overnight-contracts/common/utils/strategy-test');
const {getContract, transferETH} = require("@overnight-contracts/common/utils/script-utils");
const hre = require('hardhat');
const ethers = hre.ethers;

const HedgeExchanger = require("./abi/ets/HedgeExchanger.json");

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

    } else if (strategyName == 'StrategyEtsBeta' || strategyName == 'StrategyEtsBetaUsdt') {
        let ownerAddress = "0x5CB01385d3097b6a189d1ac8BA3364D900666445";
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [ownerAddress],
        });
        const owner = await ethers.getSigner(ownerAddress);
        let hedgeExchanger = await ethers.getContractAt(HedgeExchanger, "0x6CB841a321bCbEd949B14838339a2EBb6331e5d1");
        await hedgeExchanger.connect(owner).grantRole(await hedgeExchanger.FREE_RIDER_ROLE(), strategyAddress);
        await hedgeExchanger.connect(owner).grantRole(await hedgeExchanger.WHITELIST_ROLE(), strategyAddress);
        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [ownerAddress],
        });

    } else if (strategyName == 'StrategyEtsGamma' || strategyName == 'StrategyEtsGammaUsdt') {
        let ownerAddress = "0x5CB01385d3097b6a189d1ac8BA3364D900666445";
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [ownerAddress],
        });
        const owner = await ethers.getSigner(ownerAddress);
        let hedgeExchanger = await ethers.getContractAt(HedgeExchanger, "0x13B8883fCe15f9DC035621D09b97aFe46Cf11934");
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
    let params = {
        name: process.env.TEST_STRATEGY,
        enabledReward: true,
        isRunStrategyLogic: true
    }

    console.log(`Strategy ID ${params.name}`);

    switch (process.env.STAND) {
        case "bsc_usdt":
            strategyTest(params, 'BSC', 'usdt', runStrategyLogic);
            break;
        default:
            strategyTest(params, 'BSC', 'usdc', runStrategyLogic);
            break;
    }
});
