const {ethers} = require("hardhat");
const {BSC, OPTIMISM, DEFAULT} = require("@overnight-contracts/common/utils/assets");
const hre = require("hardhat");
const {getCoreAsset} = require("@overnight-contracts/common/utils/script-utils");

module.exports = async ({getNamedAccounts}) => {
    const {deployer} = await getNamedAccounts();

    let asset = await getCoreAsset()

    let insurance = await ethers.getContract('InsuranceExchange');
    let rebase = await ethers.getContract('InsuranceToken');
    let m2m = await ethers.getContract('Mark2Market');
    let pm = await ethers.getContract('PortfolioManager');

    await (await pm.setMark2Market(m2m.address)).wait();
    console.log("pm.setMark2Market done");

    await (await pm.setExchanger(insurance.address)).wait();
    console.log("pm.setExchanger done");

    await (await pm.setAsset(asset.address)).wait();
    console.log("pm.setAsset done");

    await (await m2m.setPortfolioManager(pm.address)).wait();
    console.log("m2m.setPortfolioManager done");

    await (await rebase.setExchanger(insurance.address)).wait();
    await (await rebase.setName('USD+ Insurance', 'USD+ INS')).wait();

    // TODO need to set for different versions USD+
    // await (await rebase.setDecimals(6)).wait();
    console.log('InsuranceToken setting done()');


    let params = {
        asset: asset.address,
        rebase: rebase.address,
        pm: pm.address,
        m2m: m2m.address,
    }

    await (await insurance.setUpParams(params)).wait();
    console.log('Insurance.setUpParams done()');

    await (await insurance.grantRole(await insurance.PORTFOLIO_AGENT_ROLE(), deployer)).wait();
    console.log('Insurance.grantRole[PORTFOLIO_AGENT_ROLE] done()');

    await (await pm.grantRole(await pm.PORTFOLIO_AGENT_ROLE(), deployer)).wait();
    console.log('pm.grantRole[PORTFOLIO_AGENT_ROLE] done()');

};

module.exports.tags = ['InsuranceSetting'];
