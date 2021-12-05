
module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    await deploy('GovToken', {
        from: deployer,
        args: [],
        log: true,
    });

    await deploy('TimelockController', {
        from: deployer,
        args: [10, [], []],
        log: true,
    });


    const token = await ethers.getContract("GovToken");
    const controller = await ethers.getContract("TimelockController");


    await deploy('OvnGovernorBravo', {
        from: deployer,
        args: [token.address, controller.address ],
        log: true,
    });
};

module.exports.tags = ['base','Governance'];
