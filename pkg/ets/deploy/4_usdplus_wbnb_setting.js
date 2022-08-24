const {ethers} = require("hardhat");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");
const {getContract } = require("@overnight-contracts/common/utils/script-utils");

let dystRouter = '0xbE75Dd16D029c6B32B7aD57A0FD9C1c20Dd2862e'; //DystRouter01
let dystPair = '0x1A5FEBA5D5846B3b840312Bd04D76ddaa6220170'; //WMATIC/USD+
let gauge = '0x7c9716266795a04ae1fbbd017dc2585fbf78076d'; //aka MasterChef
let dystToken = '0x39aB6574c289c3Ae4d88500eEc792AB5B947A5Eb';
let uniswapV3Router = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45';
let poolFeeMaticUsdc = 500;


let penToken = '0x9008D70A5282a936552593f410AbcBcE2F891A97';
let penProxy = '0xc9Ae7Dac956f82074437C6D40f67D6a5ABf3E34b';
let penLens = '0x1432c3553FDf7FBD593a84B3A4d380c643cbf7a2';

let wmaticUsdcSlippagePersent = 10; //0.1%

let liquidationThreshold = 850;
let healthFactor = 1350
let balancingDelta = 1;

let usdPlus = '0xe80772Eaf6e2E18B651F160Bc9158b2A5caFCA65';
let busd = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';
let wbnb = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
let vBusdToken = '0x95c78222B3D6e262426483D42CfA53685A67Ab9D';
let vBnbToken = '0xA07c5b74C9B40447a954e1466938b865b6BBea36';
let oracleBusd = '0xcBb98864Ef56E9042e7d2efef76141f15731B82f';
let oracleBnb = '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE';

module.exports = async () => {

    const strategy = await ethers.getContract("StrategyUsdPlusWbnb");

    const exchange = await getContract('Exchange', 'bsc');
    const usdPlus = await getContract('UsdPlusToken', 'bsc');
    // const hedgeExchanger = await getContract('HedgeExchangerUsdPlusWmatic', );

    if (strategy) {

        // await (await strategy.setExchanger(hedgeExchanger.address));

        let setupParams = {
            usdPlus: usdPlus.address,
            busd: busd,
            wbnb: wbnb,
            vBusdToken: vBusdToken,
            vBnbToken: vBnbToken,
            oracleBusd: oracleBusd,
            oracleBnb: oracleBnb
        }

        await (await strategy.setParams(setupParams)).wait();

        console.log('Setting done');
    }


};

module.exports.tags = ['StrategyUsdPlusWbnbSetting'];
