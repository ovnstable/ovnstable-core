const {deployProxy, deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");

module.exports = async ({deployments, getNamedAccounts}) => {
    const {save} = deployments;
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    console.log('Deployer: ' + deployer)

    await deployProxy('InsuranceExchange', deployments, save);
    await deployProxyMulti('RebaseToken', 'RebaseToken', deployments, save, {});
    await deployProxyMulti('AssetToken', 'RebaseToken', deployments, save, {});

    await deploy('MockPortfolioManager', {
        from: deployer,
        args: [],
        log: true,
    });

    let rebase = await ethers.getContract('RebaseToken');
    let asset = await ethers.getContract('AssetToken');
    let insurance = await ethers.getContract('InsuranceExchange');
    let pm = await ethers.getContract('MockPortfolioManager');


    await asset.setExchanger(deployer);
    await asset.setName('MockUSDC', 'MockUSDC');
    await asset.setDecimals(6);

    await rebase.setExchanger(insurance.address);
    await rebase.setName('Insurance', 'INSR');
    await rebase.setDecimals(await asset.decimals());


    let params = {
        asset: asset.address,
        rebase: rebase.address,
        pm: pm.address,
        m2m: pm.address,
    }


    await insurance.setUpParams(params);
};

module.exports.tags = ['MockInsurance'];
