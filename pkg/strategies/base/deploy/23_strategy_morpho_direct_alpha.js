const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {BASE, COMMON} = require('@overnight-contracts/common/utils/assets');
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection('', async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        usdc: BASE.usdc,
        morpho: BASE.morpho,
        marketId: "0x104ff0b7c0d67301cb24e3a10b928b0fb0026ee26338e28553b7064fa8b659a9",
        marketParams: {
            loanToken: BASE.usdc,
            collateralToken: BASE.wUsdPlus,
            oracle: "0x510A4C82f7eBf030aE2bcBDaC2504E59dF03b3E8",
            irm: "0x46415998764C29aB2a25CbeA6254146D50D22687",
            lltv: "770000000000000000"
        },
        treasury: COMMON.rewardWallet,
        fee: 2000
    };
}

module.exports.tags = ['StrategyMorphoDirect'];
