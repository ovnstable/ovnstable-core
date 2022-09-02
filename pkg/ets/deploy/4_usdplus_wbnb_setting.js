const {ethers} = require("hardhat");
const {getContract } = require("@overnight-contracts/common/utils/script-utils");

let busd = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';
let wbnb = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
let vBusdToken = '0x95c78222B3D6e262426483D42CfA53685A67Ab9D';
let vBnbToken = '0xA07c5b74C9B40447a954e1466938b865b6BBea36';
let unitroller = "0xfD36E2c2a6789Db23113685031d7F16329158384";
let maximillion = '0x5efA1e46F4Fd738FF721F5AebC895b970F13E8A1';
let oracleBusd = '0xcBb98864Ef56E9042e7d2efef76141f15731B82f';
let oracleWbnb = '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE';

let coneRouter = "0xbf1fc29668e5f5Eaa819948599c9Ac1B1E03E75F";
let conePair = "0xeC30Da6361905B8f3e4a93513D937dB992301276";
let coneVoter = "0xC3B5d80E4c094B17603Ea8Bb15d2D31ff5954aAE";
let coneToken = "0xa60205802e1b5c6ec1cafa3cacd49dfeece05ac9";
let coneGauge = "0xA766094e9bf0AFc1BB5208EC9a81a782663d797a";
let veCone = '0xd0C1378c177E961D96c06b0E8F6E7841476C81Ef';
let veConeId = 2;

let dodoProxy = "0x8f8dd7db1bda5ed3da8c9daf3bfa471c12d58486";
let dodoBusdWbnb = "0x0fe261aeE0d1C4DFdDee4102E82Dd425999065F4";
let dodoApprove = "0xa128Ba44B2738A558A1fdC06d6303d52D3Cef8c1";

let wbnbBusdSlippagePercent = 100; //1%
let liquidationThreshold = 800;
let healthFactor = 1350


module.exports = async () => {

    const strategy = await ethers.getContract("StrategyUsdPlusWbnb");
    const control = await ethers.getContract('ControlUsdPlusWbnb');

    const exchange = await getContract('Exchange', 'bsc');
    const usdPlus = await getContract('UsdPlusToken', 'bsc');
    const hedgeExchanger = await getContract('HedgeExchangerUsdPlusWbnb', 'bsc');

    if (strategy) {

        await (await strategy.setExchanger(hedgeExchanger.address)).wait();

        let setupParams = {
            usdPlus: usdPlus.address,
            busd: busd,
            wbnb: wbnb,
            vBusdToken: vBusdToken,
            vBnbToken: vBnbToken,
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
            dodoProxy: dodoProxy,
            dodoBusdWbnb: dodoBusdWbnb,
            dodoApprove: dodoApprove,
            tokenAssetSlippagePercent: wbnbBusdSlippagePercent,
            liquidationThreshold: liquidationThreshold,
            healthFactor: healthFactor,
            control: control.address
        }

        await (await strategy.setParams(setupParams)).wait();

        console.log('Setting done');
    }


};

module.exports.tags = ['StrategyUsdPlusWbnbSetting'];
