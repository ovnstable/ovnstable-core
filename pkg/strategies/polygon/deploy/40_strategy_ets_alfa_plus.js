const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");

let rebaseToken = '0x3cDf8058aC41FB4477BcE7c6E1F2e166aeB186D1';
let hedgeExchanger = '0x910336883586354643295b47BeF69F4F470e3DFc';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategyEts', deployments, save, null);
    });

    await settingSection(async (strategy) => {

        await (await strategy.setParams(
            {
                asset: POLYGON.usdc,
                rebaseToken: rebaseToken,
                hedgeExchanger: hedgeExchanger,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyEtsAlfaPlus'];
