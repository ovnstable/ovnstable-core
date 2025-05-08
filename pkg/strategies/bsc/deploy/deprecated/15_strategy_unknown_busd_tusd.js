const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {BSC, COMMON} = require("@overnight-contracts/common/utils/assets");

let coneToken = '0xA60205802E1B5C6EC1CAFA3cAcd49dFeECe05AC9';
let coneRouter = '0xbf1fc29668e5f5Eaa819948599c9Ac1B1E03E75F';
let conePair = '0xbC16f0a31f2EAc3029C0F991bf4E05CD13bb9Ab7';
let rewardWalletPercent = 0; // 20%
let unkwnToken = '0xD7FbBf5CB43b4A902A8c994D94e821f3149441c7';
let unkwnUserProxy = '0xAED5a268dEE37677584af58CCC2b9e3c83Ab7dd8';
let unkwnLens = '0x5b1cEB9adcec674552CB26dD55a5E5846712394C';
let stakeStep = '10000000000000000000000'; // 10000 busd
let annexStablePool = "0x860822cac26fb7e74e2cfad2642bc8a14d512270";

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                busdToken: BSC.busd,
                tusdToken: BSC.tusd,
                wBnbToken: BSC.wBnb,
                coneToken: coneToken,
                coneRouter: coneRouter,
                conePair: conePair,
                chainlinkBusd: BSC.chainlinkBusd,
                chainlinkTusd: BSC.chainlinkTusd,
                rewardWallet: COMMON.rewardWallet,
                rewardWalletPercent: rewardWalletPercent,
                unkwnToken: unkwnToken,
                unkwnUserProxy: unkwnUserProxy,
                unkwnLens: unkwnLens,
                stakeStep: stakeStep,
                annexStablePool: annexStablePool,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyUnknownBusdTusd'];
