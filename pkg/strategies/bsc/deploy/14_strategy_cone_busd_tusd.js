const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {BSC} = require("@overnight-contracts/common/utils/assets");

let coneToken = '0xA60205802E1B5C6EC1CAFA3cAcd49dFeECe05AC9';
let coneRouter = '0xbf1fc29668e5f5Eaa819948599c9Ac1B1E03E75F';
let conePair = '0xbC16f0a31f2EAc3029C0F991bf4E05CD13bb9Ab7';
let coneGauge = '0x0481442292f7B01F761CB270A720CD74F449e8e3';
let rewardWalletPercent = 2000; // 20%
let unkwnToken = '0xD7FbBf5CB43b4A902A8c994D94e821f3149441c7';
let unkwnUserProxy = '0xAED5a268dEE37677584af58CCC2b9e3c83Ab7dd8';
let unkwnLens = '0x5b1cEB9adcec674552CB26dD55a5E5846712394C';
let unkwnPercent = 10000; // 100%
let stakeStep = '10000000000000000000000';

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
                coneGauge: coneGauge,
                chainlinkBusd: BSC.chainlinkBusd,
                chainlinkTusd: BSC.chainlinkTusd,
                rewardWallet: BSC.rewardWallet,
                rewardWalletPercent: rewardWalletPercent,
                unkwnToken: unkwnToken,
                unkwnUserProxy: unkwnUserProxy,
                unkwnLens: unkwnLens,
                unkwnPercent: unkwnPercent,
                stakeStep: stakeStep,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyConeBusdTusd'];
