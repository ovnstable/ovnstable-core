const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {BSC, COMMON} = require("@overnight-contracts/common/utils/assets");

let womToken = '0xAD6742A35fB341A9Cc6ad674738Dd8da98b94Fb1';
let asset = '0xF319947eCe3823b790dd87b0A509396fE325745a';
let pool = '0x312Bc7eAAF93f1C60Dc5AfC115FcCDE161055fb0';
let masterWombat = '0xE2C07d20AF0Fb50CAE6cDD615CA44AbaAA31F9c8';
let rewardWalletPercent = 0; // 50%

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                busdToken: BSC.busd,
                womToken: womToken,
                asset: asset,
                pool: pool,
                masterWombat: masterWombat,
                pancakeRouter: BSC.pancakeRouter,
                rewardWallet: COMMON.rewardWallet,
                rewardWalletPercent: rewardWalletPercent,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyWombatBusd'];
