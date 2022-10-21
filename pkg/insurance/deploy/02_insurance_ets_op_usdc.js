const {deployProxy, deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {DEFAULT, OPTIMISM} = require("@overnight-contracts/common/utils/assets");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deployProxy('InsuranceEtsOpUsdc', deployments, save);

    await deployProxyMulti('SeniorEtsOpUsdc', 'RebaseToken', deployments, save, null);
    console.log("SeniorEtsOpUsdc created");

    await deployProxyMulti('JuniorEtsOpUsdc', 'RebaseToken', deployments, save, null);
    console.log("JuniorEtsOpUsdc created");

    let senior = await ethers.getContract('SeniorEtsOpUsdc');
    let junior = await ethers.getContract('JuniorEtsOpUsdc');
    let insurance = await ethers.getContract('InsuranceEtsOpUsdc');

    let params = {
        senior: senior.address,
        junior: junior.address,
        asset: (await getContract('UsdPlusToken')).address,
    }

    await (await insurance.setParams(params)).wait();


    await (await senior.setExchanger(insurance.address)).wait();
    await (await senior.setName('Senior Tranche ETS OP/USDC', 'ST OP/USDC')).wait();
    console.log('Senior settings done()')

    await (await junior.setExchanger(insurance.address)).wait();
    await (await junior.setName('Junior Tranche ETS OP/USDC', 'JT OP/USDC')).wait();

    console.log('Junior settings done()')

    let setup = {
        etsToken: '0x9813724fAF14a35faAFc6cd61723a99e97D77807',
        etsExchanger: '0x270dF474f4bd2B92A45A46228683c971765E81A7'
    }

    await (await insurance.setSetup(setup)).wait();
    console.log('setSetup done()')
};

module.exports.tags = ['InsuranceEtsOpUsdc'];
