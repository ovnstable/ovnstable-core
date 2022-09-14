const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {BSC} = require("@overnight-contracts/common/utils/assets");

let womToken = '0xAD6742A35fB341A9Cc6ad674738Dd8da98b94Fb1';
let asset = '0xb43Ee2863370a56D3b7743EDCd8407259100b8e2';
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
                usdcToken: BSC.usdc,
                womToken: womToken,
                asset: asset,
                pool: pool,
                masterWombat: masterWombat,
                synapseStableSwapPool: BSC.synapseStableSwapPool,
                pancakeRouter: BSC.pancakeRouter,
                rewardWallet: BSC.rewardWallet,
                rewardWalletPercent: rewardWalletPercent,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyWombatBusdUsdc'];
