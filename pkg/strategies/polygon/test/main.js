const {strategyTest} = require('@overnight-contracts/common/utils/strategy-test');
const {
    impersonatingEtsGrantRole,
    prepareEnvironment,
    impersonatingStaker
} = require("@overnight-contracts/common/utils/tests");
const IController = require("./abi/tetu/IController.json");
const MasterMerkat = require("./abi/mmf/MasterMerkat.json");
const {Wallets} = require("@overnight-contracts/common/utils/wallets");

async function runStrategyLogic(strategyName, strategyAddress) {

    if (strategyName.indexOf('StrategyEts') !== -1) {
        let hedgeExchangerAddress = ""; // insert your address
        let ownerAddress = Wallets.DEV;
        await impersonatingEtsGrantRole(hedgeExchangerAddress, ownerAddress, strategyAddress);

    } else if (strategyName == 'StrategyTetuUsdc') {
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
    }
}

describe("POLYGON", function () {
    let params = {
        name: process.env.TEST_STRATEGY,
        enabledReward: true,
        isRunStrategyLogic: true
    }
    console.log(`Strategy ID ${params.name}`);
    strategyTest(params, 'POLYGON', 'usdc', runStrategyLogic);
});
