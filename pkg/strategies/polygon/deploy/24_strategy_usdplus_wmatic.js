const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const { ethers } = require("hardhat");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const hre = require("hardhat");

let dystRouter = '0xbE75Dd16D029c6B32B7aD57A0FD9C1c20Dd2862e'; //DystRouter01
let dystPair = '0x1A5FEBA5D5846B3b840312Bd04D76ddaa6220170'; //WMATIC/USD+
let gauge = '0x7c9716266795a04ae1fbbd017dc2585fbf78076d'; //aka MasterChef
let dystToken = '0x39aB6574c289c3Ae4d88500eEc792AB5B947A5Eb';


let penToken = '0x9008D70A5282a936552593f410AbcBcE2F891A97';
let penProxy = '0xc9Ae7Dac956f82074437C6D40f67D6a5ABf3E34b';
let penLens = '0x1432c3553FDf7FBD593a84B3A4d380c643cbf7a2';

let liquidationThreshold = 850;
let healthFactor = 1500
let balancingDelta = 1;

module.exports = async (plugin) => {
    const {deploy} = plugin.deployments;
    const {deployer} = await plugin.getNamedAccounts();
    const {save} = plugin.deployments;


    if (hre.ovn === undefined || !hre.ovn.noDeploy) {

        const usdPlusWmaticLibrary = await deploy("UsdPlusWmaticLibrary", {
            from: deployer
        });

        let params = {
            factoryOptions: {
                libraries: {
                    "UsdPlusWmaticLibrary": usdPlusWmaticLibrary.address
                }
            },
            unsafeAllow: ["external-library-linking"]
        };

        await deployProxy('StrategyUsdPlusWmatic', plugin.deployments, save, params);

    }

    if (hre.ovn === undefined || hre.ovn.setting) {

        const strategy = await ethers.getContract("StrategyUsdPlusWmatic");

        const exchange = await getContract('Exchange', 'polygon');
        const usdPlus = await getContract('UsdPlusToken', 'polygon');

        if (strategy){

            await (await strategy.setExchanger('0x4b5e0af6AE8Ef52c304CD55f546342ca0d3050bf'));

            await (await strategy.setTokens(
                POLYGON.usdc,
                POLYGON.amUsdc,
                POLYGON.wMatic,
                usdPlus.address,
                penToken,
                dystToken
            )).wait();

            await (await strategy.setParams(
                exchange.address,
                gauge,
                dystPair,
                dystRouter,
                penProxy,
                penLens,
            )).wait();

            await (await strategy.setAaveParams(
                POLYGON.aaveProvider,
                POLYGON.oracleChainlinkUsdc,
                POLYGON.oracleChainlinkMatic,
                liquidationThreshold,
                healthFactor,
                balancingDelta
            )).wait();

            console.log('Setting done');
        }
    }




};

module.exports.tags = ['StrategyUsdPlusWmatic'];
