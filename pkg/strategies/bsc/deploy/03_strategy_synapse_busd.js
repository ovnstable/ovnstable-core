const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {BSC} = require('@overnight-contracts/common/utils/assets');
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");

let nUsdLPToken = '0xa4b7Bc06EC817785170C2DbC1dD3ff86CDcdcc4C';
let synToken = '0xa4080f1778e69467E905B8d6F72f6e441f9e9484';
let swap = '0x28ec0B36F0819ecB5005cAB836F4ED5a2eCa4D13';
let miniChefV2 = '0x8F5BBB2BB8c2Ee94639E55d5F41de9b4839C1280';
let pid = 1;

module.exports = async ({deployments}) => {
    const {save} = deployments;


    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setTokens(BSC.busd, nUsdLPToken, synToken)).wait();
        await (await strategy.setParams(swap, miniChefV2, BSC.pancakeRouter, pid)).wait();
    });

};

module.exports.tags = ['StrategySynapseBusd'];
