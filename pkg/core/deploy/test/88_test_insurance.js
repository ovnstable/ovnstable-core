const {deployProxy, deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");
const {ethers} = require("hardhat");
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");

module.exports = async ({deployments, getNamedAccounts}) => {
    const {save} = deployments;
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    console.log('Deployer: ' + deployer)

    await deployProxy('InsuranceExchange', deployments, save);

    await deployProxyMulti('RebaseToken', 'RebaseToken', deployments, save,  {args: ["Insurance", "Insurance", 18]});
    await deployProxyMulti('AssetToken', 'RebaseToken', deployments, save,  {args: ["MockUSDC", "MockUSDC", 6]});

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
    await rebase.setExchanger(insurance.address);


    let params = {
        asset: asset.address,
        rebase: rebase.address,
        odosRouter: OPTIMISM.odosRouterV2,
        assetOracle: ZERO_ADDRESS,
        roleManager: insurance.address,
    }


    console.log(`SetUpParams: ${JSON.stringify(params)}`)
    await insurance.setUpParams(params);
    await insurance.grantRole(await insurance.PORTFOLIO_AGENT_ROLE(), deployer);

    await pm.setAsset(asset.address);

    console.log('MockInsurance done()');
};

module.exports.tags = ['MockInsurance'];
