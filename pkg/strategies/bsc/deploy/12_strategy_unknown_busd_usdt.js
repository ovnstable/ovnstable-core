const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {BSC} = require("@overnight-contracts/common/utils/assets");

let coneToken = '0xA60205802E1B5C6EC1CAFA3cAcd49dFeECe05AC9';
let unkwnToken = '0xD7FbBf5CB43b4A902A8c994D94e821f3149441c7';
let coneRouter = '0xbf1fc29668e5f5Eaa819948599c9Ac1B1E03E75F';
let conePair = '0xcCDFe07cfE7a80EDf76EdB2332605e1391988F08';
let unkwnUserProxy = '0xAED5a268dEE37677584af58CCC2b9e3c83Ab7dd8';
let unkwnLens = '0x5b1cEB9adcec674552CB26dD55a5E5846712394C';
let rewardWalletPercent = 2000; // 20%

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                busdToken: BSC.busd,
                usdtToken: BSC.usdt,
                wBnbToken: BSC.wBnb,
                coneToken: coneToken,
                unkwnToken: unkwnToken,
                coneRouter: coneRouter,
                conePair: conePair,
                unkwnUserProxy: unkwnUserProxy,
                unkwnLens: unkwnLens,
                synapseStableSwapPool: BSC.synapseStableSwapPool,
                chainlinkBusd: BSC.chainlinkBusd,
                chainlinkUsdt: BSC.chainlinkUsdt,
                rewardWallet: BSC.rewardWallet,
                rewardWalletPercent: rewardWalletPercent,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyUnknownBusdUsdt'];
