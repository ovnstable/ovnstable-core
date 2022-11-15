const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");

let rebaseToken = '0x8B6174956520cdFF6aD532F13590d73aFC7288e6';
let hedgeExchanger = '0xdD7e3823d9178CEFBB486b1c56Fd31EE7DcfF323';

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

module.exports.tags = ['StrategyEtsAlfaWmaticUsdc'];
