const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async ({deployments}) => {
    const {save} = deployments;
    let Market = await deployProxy('Market', deployments, save);

    console.log("Market created");

    if (hre.ovn.verify){
        await hre.run("verify:verify", {
            address: Market.address,
            constructorArguments: [],
        });
    }
};

module.exports.tags = ['base', 'test', 'Market'];
