
module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const ovn = await ethers.getContract("OvernightToken");
    const exchange = await ethers.getContract("Exchange");

    await ovn.setExchanger(exchange.address);
    console.log("ovn.setExchanger done")

};

module.exports.tags = ['SettingOvn'];
