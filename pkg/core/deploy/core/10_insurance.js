const {deployProxy, deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");
const hre = require("hardhat");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");
const {initWallet, getContract} = require("@overnight-contracts/common/utils/script-utils");
const {Roles} = require("@overnight-contracts/common/utils/roles");

module.exports = async ({deployments, getNamedAccounts}) => {
    const {save} = deployments;

    // await deployProxy('InsuranceExchange', deployments, save);

    let insurance = await ethers.getContract('InsuranceExchange')
    console.log(`InsuranceExchange deployed at ${insurance.address}`);

    let params = {
        args : ['Overnight Insurance',  'INS', 18]
    }

    // await deployProxyMulti('InsuranceToken', 'RebaseToken', deployments, save, params);

    let insuranceToken = await ethers.getContract('InsuranceToken')
    console.log(`InsuranceToken deployed at ${insuranceToken.address}`);

    console.log('Name:     ' + await insuranceToken.name());
    console.log('Symbol:   ' + await insuranceToken.symbol());
    console.log('Decimals: ' + await insuranceToken.decimals());


    // await (await insuranceToken.setExchanger(insurance.address)).wait();
    // console.log('InsuranceToken.setExchange done()');

    let asset;
    let odosRouter;
    if (hre.network.name === "optimism") {
        asset = await getContract('Ovn');
        odosRouter = OPTIMISM.odosRouterV2;
    }else {
        throw new Error('Need setting params!');
    }

    let setUpParams = {
        asset: asset.address,
        rebase: insuranceToken.address,
        odosRouter: odosRouter
    }


    await (await insurance.setUpParams(setUpParams)).wait();
    console.log('Insurance.setUpParams done()');


    let wallet = await initWallet();

    await (await insurance.grantRole(Roles.PORTFOLIO_AGENT_ROLE, wallet.address)).wait(); // dev
    await (await insurance.grantRole(Roles.PORTFOLIO_AGENT_ROLE, '0x0bE3f37201699F00C21dCba18861ed4F60288E1D')).wait(); // pm
    await (await insurance.grantRole(Roles.PORTFOLIO_AGENT_ROLE, '0xe497285e466227F4E8648209E34B465dAA1F90a0')).wait(); // ovn
    console.log('Insurance.grantRole[PORTFOLIO_AGENT_ROLE] done()');

    await (await insurance.grantRole(Roles.UNIT_ROLE, '0xb8f55cdd8330b9bf9822137Bc8A6cCB89bc0f055')).wait(); // payout
    console.log('Insurance.grantRole[UNIT_ROLE] done()');

    let exchange=  await getContract('Exchange');
    await (await insurance.grantRole(await insurance.INSURED_ROLE(), exchange.address)).wait();
    console.log('Insurance.grantRole[INSURED_ROLE] to Exchange');

};

module.exports.tags = ['Insurance'];
