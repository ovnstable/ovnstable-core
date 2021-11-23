
let aCurvepoolStake = "0x445FE580eF8d70FF569aB36e80c647af338db351"
let aaveAddress = "0xd05e3E715d945B59290df0ae8eF85c1BdB684744";

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const connAAVE = await ethers.getContract("ConnectorAAVE");
    const connCurve = await ethers.getContract("ConnectorCurve");

    await connAAVE.setLpap(aaveAddress);
    console.log("connAAVE.setLpap done");

    await connCurve.setPool(aCurvepoolStake);
    console.log("connCurve.setPool done");

};

module.exports.tags = ['Connectors'];
