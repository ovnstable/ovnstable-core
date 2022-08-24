const {ethers} = require("hardhat");
const {getContract } = require("@overnight-contracts/common/utils/script-utils");

let busd = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';
let wbnb = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
let vBusdToken = '0x95c78222B3D6e262426483D42CfA53685A67Ab9D';
let vBnbToken = '0xA07c5b74C9B40447a954e1466938b865b6BBea36';
let oracleBusd = '0xcBb98864Ef56E9042e7d2efef76141f15731B82f';
let oracleBnb = '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE';

let coneRouter = "0xbf1fc29668e5f5Eaa819948599c9Ac1B1E03E75F";
let conePair = "0xeC30Da6361905B8f3e4a93513D937dB992301276";

let dodoProxy = "0x8f8dd7db1bda5ed3da8c9daf3bfa471c12d58486";
let dodoBusdWbnb = "0x0fe261aeE0d1C4DFdDee4102E82Dd425999065F4";
let dodoApprove = "0xa128Ba44B2738A558A1fdC06d6303d52D3Cef8c1";

let wbnbBusdSlippagePercent = 50; //0.5%


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
            oracleBnb: oracleBnb,
            coneRouter: coneRouter,
            conePair: conePair,
            exchange: exchange.address,
            dodoProxy: dodoProxy,
            dodoBusdWbnb: dodoBusdWbnb,
            dodoApprove: dodoApprove,
            tokenAssetSlippagePercent: wbnbBusdSlippagePercent,
        }

        await (await strategy.setParams(setupParams)).wait();

        console.log('Setting done');
    }


};

module.exports.tags = ['StrategyUsdPlusWbnbSetting'];
