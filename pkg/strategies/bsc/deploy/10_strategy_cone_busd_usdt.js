const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {BSC} = require("@overnight-contracts/common/utils/assets");

let coneToken = '0xA60205802E1B5C6EC1CAFA3cAcd49dFeECe05AC9';
let coneRouter = '0xbf1fc29668e5f5Eaa819948599c9Ac1B1E03E75F';
let conePair = '0xcCDFe07cfE7a80EDf76EdB2332605e1391988F08';
let coneGauge = '0x67c5C216ba6Ca3C2AaC3258d2E5e02DCcE460a29';
let synapseStableSwapPool = '0x28ec0B36F0819ecB5005cAB836F4ED5a2eCa4D13';
let rewardWalletPercent = 5000; // 50%
let unkwnToken = '0xD7FbBf5CB43b4A902A8c994D94e821f3149441c7';
let unkwnUserProxy = '0xAED5a268dEE37677584af58CCC2b9e3c83Ab7dd8';
let unkwnLens = '0x5b1cEB9adcec674552CB26dD55a5E5846712394C';
let unkwnPercent = 10; // 0.1%

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
                coneRouter: coneRouter,
                conePair: conePair,
                coneGauge: coneGauge,
                synapseStableSwapPool: synapseStableSwapPool,
                chainlinkBusd: BSC.chainlinkBusd,
                chainlinkUsdt: BSC.chainlinkUsdt,
                rewardWallet: BSC.rewardWallet,
                rewardWalletPercent: rewardWalletPercent,
                unkwnToken: unkwnToken,
                unkwnUserProxy: unkwnUserProxy,
                unkwnLens: unkwnLens,
                unkwnPercent: unkwnPercent,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyConeBusdUsdt'];
