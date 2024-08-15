const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const hre = require("hardhat");
const {ethers} = require("hardhat");

module.exports = async ({deployments, getNamedAccounts}) => {
    const {deploy, save} = deployments;
    const {deployer} = await getNamedAccounts();

    let ovn = await ethers.getContract('Ovn');
    let timelock = await ethers.getContract('OvnTimelock');

    let governor = await deploy('OvnGovernor', {
        from: deployer,
        args: [ovn.address, timelock.address ],
        log: true,
    });


    if (hre.ovn.verify){
        await hre.run("verify:verify", {
            address: governor.address,
            constructorArguments: [ovn.address, timelock.address ],
        });
    }

    console.log("OvnGovernor deployed at " + governor.address);

};

module.exports.tags = ['OvnGovernor'];
