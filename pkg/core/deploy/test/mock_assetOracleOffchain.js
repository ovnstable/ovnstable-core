const {deployProxy, deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers, deployments, getNamedAccounts} = require("hardhat");

module.exports = async ({deployments, getNamedAccounts}) => {
    const {deployer} = await getNamedAccounts();
    const {deploy, save} = deployments;

    await deployProxy('AssetOracleOffChain', deployments, deployments.save);
    await deployProxyMulti('OvnToken', 'RebaseToken', deployments, deployments.save,  {args: ["OVN", "OVN", 18]});

    await deploy("MockPriceFeed", {
        from: deployer,
        args: [],
        log: true,
        skipIfAlreadyDeployed: false
    });

};

module.exports.tags = ['TestAssetOracleOffchain'];
