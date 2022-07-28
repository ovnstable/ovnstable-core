const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const hre = require("hardhat");
const {ethers} = require("hardhat");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");
const {core} = require("@overnight-contracts/common/utils/core");

let dystToken = '0x39aB6574c289c3Ae4d88500eEc792AB5B947A5Eb';
let dystPair = '0xA498a892AD0D3F70AA449798023AA1F4A0888268'; //sAMM-USDC/TUSD
let dystRouter = '0xbE75Dd16D029c6B32B7aD57A0FD9C1c20Dd2862e'; //DystRouter01
let gauge = '0x9c3Afbc9D0540168C6D4f3dA0F48FeBA6a3A7d2a'; //aka MasterChef
let penToken = '0x9008D70A5282a936552593f410AbcBcE2F891A97';
let userProxy = '0xc9Ae7Dac956f82074437C6D40f67D6a5ABf3E34b';
let penLens = '0x1432c3553FDf7FBD593a84B3A4d380c643cbf7a2';
let swapper = '0x019D17272687904F855D235dbBA7fD9268088Ea5';
let stakeStep = 10000000000;

module.exports = async ({deployments}) => {
    const {save} = deployments;


    if (hre.ovn === undefined || !hre.ovn.noDeploy) {
        await deployProxy('StrategyDystopiaUsdcTusd', deployments, save);
    }

    if (hre.ovn === undefined || hre.ovn.setting) {

        const strategy = await ethers.getContract("StrategyDystopiaUsdcTusd");

        await (await strategy.setTokens(POLYGON.usdc, POLYGON.tusd, dystToken, POLYGON.wMatic, penToken)).wait();
        console.log(`setTokens done for ${strategy.address}`)

        await (await strategy.setParams(
            gauge,
            dystPair,
            dystRouter,
            POLYGON.oracleChainlinkUsdc,
            POLYGON.oracleChainlinkDai,
            userProxy,
            penLens,
            swapper,
            stakeStep
        )).wait();
        console.log(`setParams done for ${strategy.address}`)

        await (await strategy.setPortfolioManager(core.pm)).wait();

        console.log('StrategyDystopiaUsdcTusd setting done');
    }
}
module.exports.tags = ['StrategyDystopiaUsdcTusd'];
