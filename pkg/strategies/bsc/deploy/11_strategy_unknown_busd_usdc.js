const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {BSC, COMMON} = require("@overnight-contracts/common/utils/assets");

let coneToken = '0xA60205802E1B5C6EC1CAFA3cAcd49dFeECe05AC9';
let coneRouter = '0xbf1fc29668e5f5Eaa819948599c9Ac1B1E03E75F';
let conePair = '0xF9D8A57c4F0bE3BDc6857Ee568F6B23FF9c4d1c6';
let coneGauge = '0x44c890Fcfd2D2cdfDa40aCaCa715375C6DA57821';
let rewardWalletPercent = 2000; // 20%
let unkwnToken = '0xD7FbBf5CB43b4A902A8c994D94e821f3149441c7';
let unkwnUserProxy = '0xAED5a268dEE37677584af58CCC2b9e3c83Ab7dd8';
let unkwnLens = '0x5b1cEB9adcec674552CB26dD55a5E5846712394C';
let unkwnPercent = 2860; // 28.6%

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                busdToken: BSC.busd,
                usdcToken: BSC.usdc,
                wBnbToken: BSC.wBnb,
                coneToken: coneToken,
                coneRouter: coneRouter,
                conePair: conePair,
                coneGauge: coneGauge,
                synapseStableSwapPool: BSC.synapseStableSwapPool,
                chainlinkBusd: BSC.chainlinkBusd,
                chainlinkUsdc: BSC.chainlinkUsdc,
                rewardWallet: COMMON.rewardWallet,
                rewardWalletPercent: rewardWalletPercent,
                unkwnToken: unkwnToken,
                unkwnUserProxy: unkwnUserProxy,
                unkwnLens: unkwnLens,
                unkwnPercent: unkwnPercent,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyUnknownBusdUsdc'];
