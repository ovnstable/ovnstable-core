const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {POLYGON} = require('@overnight-contracts/common/utils/assets');
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");

let mmfToken = '0x22a31bD4cB694433B6de19e0aCC2899E553e9481';
let meerkatRouter02 = '0x51aBA405De2b25E5506DeA32A6697F450cEB1a17';
let meerkatPair = '0x384c1b95027B73a98FE31Ea5B4B7b031b9ddD724';
let masterMeerkat = '0xa2B417088D63400d211A4D5EB3C4C5363f834764';
let pid = 7;
let synapseSwap = '0x85fCD7Dd0a1e1A9FCD5FD886ED522dE8221C3EE5';

module.exports = async (plugin) => {
    const {deploy, save} = plugin.deployments;
    const {deployer} = await plugin.getNamedAccounts();

    await deploySection(async (name) => {
        const synapseLibrary = await deploy("SynapseLibrary", {
            from: deployer
        });

        const uniswapV2Library = await deploy("UniswapV2Library", {
            from: deployer
        });

        let params = {
            factoryOptions: {
                libraries: {
                    "SynapseLibrary": synapseLibrary.address,
                    "UniswapV2Library": uniswapV2Library.address,
                }
            },
            unsafeAllow: ["external-library-linking"]
        };

        await deployProxy(name, plugin.deployments, save, params);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                usdcToken: POLYGON.usdc,
                usdtToken: POLYGON.usdt,
                mmfToken: mmfToken,
                meerkatRouter02: meerkatRouter02,
                meerkatPair: meerkatPair,
                masterMeerkat: masterMeerkat,
                pid: pid,
                synapseSwap: synapseSwap,
                oracleUsdc: POLYGON.oracleChainlinkUsdc,
                oracleUsdt: POLYGON.oracleChainlinkUsdt
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyMMFUsdcUsdt'];
