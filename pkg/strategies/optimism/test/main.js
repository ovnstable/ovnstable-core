const {OPTIMISM} = require('@overnight-contracts/common/utils/assets');
const {strategyTest} = require('@overnight-contracts/common/utils/strategy-test');
const {transferETH} = require("@overnight-contracts/common/utils/script-utils");
const {impersonatingEtsGrantRole} = require("@overnight-contracts/common/utils/tests");

const ReaperSonneUsdc = require("./abi/reaper/ReaperSonneUsdc.json");
const ReaperSonneDai = require("./abi/reaper/ReaperSonneDai.json");
const ReaperSonneUsdt = require("./abi/reaper/ReaperSonneUsdt.json");
const HedgeExchanger = require("./abi/ets/HedgeExchanger.json");

async function runStrategyLogic(strategyName, strategyAddress) {

    if (strategyName.indexOf('StrategyEts') !== -1) {
        let hedgeExchangerAddress = "0x77020E5b2F9a77667DB39712408cb86c172aeAe9";
        let ownerAddress = "0x5CB01385d3097b6a189d1ac8BA3364D900666445";
        await impersonatingEtsGrantRole(hedgeExchangerAddress, ownerAddress, strategyAddress);

    } else if (strategyName.indexOf('StrategyReaperSonne') !== -1) {
        await transferETH(1, governanceAddress);
        let governanceAddress = "0x9BC776dBb134Ef9D7014dB1823Cd755Ac5015203";
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [governanceAddress],
        });

        const governance = await ethers.getSigner(governanceAddress);
        let reaperSonne;
        if (strategyName == 'StrategyReaperSonneUsdc') {
            reaperSonne = await ethers.getContractAt(ReaperSonneUsdc, "0x566c68Cd2f1e8b6D780c342B207B60c9c4f32767");
        } else if (strategyName == 'StrategyReaperSonneDai' || strategyName == 'StrategyReaperSonneDaiDai') {
            reaperSonne = await ethers.getContractAt(ReaperSonneDai, "0x071A922d81d604617AD5276479146bF9d7105EFC");
        } else if (strategyName == 'StrategyReaperSonneUsdt') {
            reaperSonne = await ethers.getContractAt(ReaperSonneUsdt, "0xcF14ef7C69166847c71913dc449c3958F55998d7");
        }
        await reaperSonne.connect(governance).updateSecurityFee(0);

        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [governanceAddress],
        });

    }
}

describe("OPTIMISM", function () {
    let params = {
        name: process.env.TEST_STRATEGY,
        enabledReward: true,
        isRunStrategyLogic: true
    }

    console.log(`Strategy ID ${params.name}`);

    switch (process.env.STAND) {
        case 'optimism_dai':
            strategyTest(params, 'OPTIMISM', 'dai', runStrategyLogic);
            break;
        default:
            strategyTest(params, 'OPTIMISM', 'usdc', runStrategyLogic);
            break;
    }
});
