const {ethers} = require("hardhat");
const {getContract } = require("@overnight-contracts/common/utils/script-utils");

let busd = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';
let wbnb = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
let vBusdToken = '0x95c78222B3D6e262426483D42CfA53685A67Ab9D';
let vBnbToken = '0xA07c5b74C9B40447a954e1466938b865b6BBea36';
let xvsToken = '0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63';

let unitroller = "0xfD36E2c2a6789Db23113685031d7F16329158384";
let maximillion = '0x5efA1e46F4Fd738FF721F5AebC895b970F13E8A1';
let oracleBusd = '0xcBb98864Ef56E9042e7d2efef76141f15731B82f';
let oracleWbnb = '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE';

let coneRouter = "0xbf1fc29668e5f5Eaa819948599c9Ac1B1E03E75F";
let conePair = "0x881b608ec7e15cd5bb4da9db6ae9c477b4f67731"; // WBNB-BUSD Pair
let coneVoter = "0xC3B5d80E4c094B17603Ea8Bb15d2D31ff5954aAE";
let coneToken = "0xa60205802e1b5c6ec1cafa3cacd49dfeece05ac9";
let coneGauge = "0xA766094e9bf0AFc1BB5208EC9a81a782663d797a";
let veCone = '0xd0C1378c177E961D96c06b0E8F6E7841476C81Ef';
let veConeId = 0;

let unkwnToken = '0xD7FbBf5CB43b4A902A8c994D94e821f3149441c7';
let unkwnUserProxy = '0xAED5a268dEE37677584af58CCC2b9e3c83Ab7dd8';
let unkwnLens = '0x5b1cEB9adcec674552CB26dD55a5E5846712394C';

let pancakeRouter = '0x10ED43C718714eb63d5aA57B78B54704E256024E';

let wbnbBusdSlippagePercent = 100; //1%
let liquidationThreshold = 800;
let healthFactor = 1350;


module.exports = async () => {

    const strategy = await ethers.getContract("StrategyBusdWbnb");
    const control = await ethers.getContract('ControlBusdWbnb');

    const exchange = await getContract('Exchange', 'bsc');
    const usdPlus = await getContract('UsdPlusToken', 'bsc');
    const hedgeExchanger = await getContract('HedgeExchangerBusdWbnb', 'bsc');

    if (strategy) {

        await (await strategy.setExchanger(hedgeExchanger.address)).wait();

        let setupParams = {
            usdPlus: usdPlus.address,
            busd: busd,
            wbnb: wbnb,
            vBusdToken: vBusdToken,
            vBnbToken: vBnbToken,
            xvsToken: xvsToken,
            unitroller: unitroller,
            maximillion: maximillion,
            oracleBusd: oracleBusd,
            oracleWbnb: oracleWbnb,
            coneRouter: coneRouter,
            conePair: conePair,
            coneVoter: coneVoter,
            coneGauge: coneGauge,
            coneToken: coneToken,
            veCone: veCone,
            veConeId: veConeId,
            exchange: exchange.address,
            tokenAssetSlippagePercent: wbnbBusdSlippagePercent,
            liquidationThreshold: liquidationThreshold,
            healthFactor: healthFactor,
            unkwnToken: unkwnToken,
            unkwnUserProxy: unkwnUserProxy,
            unkwnLens: unkwnLens,
            control: control.address,
            pancakeRouter: pancakeRouter,
        }

        await (await strategy.setParams(setupParams)).wait();

        console.log('Setting done');
    }


};

module.exports.tags = ['StrategyBusdWbnbSetting'];
