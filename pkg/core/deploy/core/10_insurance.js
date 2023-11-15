const {deployProxy, deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");
const hre = require("hardhat");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");
const {initWallet, getContract} = require("@overnight-contracts/common/utils/script-utils");
const {Roles} = require("@overnight-contracts/common/utils/roles");

module.exports = async ({deployments, getNamedAccounts}) => {
    const {save} = deployments;

    await deployProxy('InsuranceExchange', deployments, save);

    // let insurance = await ethers.getContract('InsuranceExchange')
    // console.log(`InsuranceExchange deployed at ${insurance.address}`);
    //
    // let params = {
    //     args : ['Overnight Insurance',  'INS', 18]
    // }
    //
    // // await deployProxyMulti('InsuranceToken', 'RebaseToken', deployments, save, params);
    //
    // let insuranceToken = await ethers.getContract('InsuranceToken')
    // console.log(`InsuranceToken deployed at ${insuranceToken.address}`);
    //
    // console.log('Name:     ' + await insuranceToken.name());
    // console.log('Symbol:   ' + await insuranceToken.symbol());
    // console.log('Decimals: ' + await insuranceToken.decimals());
    //
    //
    // // await (await insuranceToken.setExchanger(insurance.address)).wait();
    // // console.log('InsuranceToken.setExchange done()');
    //
    // let asset;
    // let odosRouter;
    // if (hre.network.name === "optimism") {
    //     asset = await getContract('Ovn');
    //     odosRouter = OPTIMISM.odosRouterV2;
    // }else {
    //     throw new Error('Need setting params!');
    // }
    //
    // let setUpParams = {
    //     asset: asset.address,
    //     rebase: insuranceToken.address,
    //     odosRouter: odosRouter
    // }
    //
    //
    // await (await insurance.setUpParams(setUpParams)).wait();
    // console.log('Insurance.setUpParams done()');
    //
    //

    // let roleManager = await getContract('RoleManager');
    // await (await insurance.setRoleManager(roleManager.address)).wait();

    //
    // let exchange=  await getContract('Exchange');
    // await (await insurance.grantRole(await insurance.INSURED_ROLE(), exchange.address)).wait();
    // console.log('Insurance.grantRole[INSURED_ROLE] to Exchange');

};

module.exports.tags = ['Insurance'];
