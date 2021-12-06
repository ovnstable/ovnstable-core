const { ethers } = require("hardhat");

let aCurvepoolStake = "0x445FE580eF8d70FF569aB36e80c647af338db351";
let aaveAddress = "0xd05e3E715d945B59290df0ae8eF85c1BdB684744";
let idleToken = "0x1ee6470CD75D5686d0b2b90C0305Fa46fb0C89A1";

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const connAAVE = await ethers.getContract("ConnectorAAVE");
    const connCurve = await ethers.getContract("ConnectorCurve");
    const connIDLE = await ethers.getContract("ConnectorIDLE");

    await connAAVE.setLpap(aaveAddress);
    console.log("connAAVE.setLpap done");

    await connCurve.setPool(aCurvepoolStake);
    console.log("connCurve.setPool done");

    await connIDLE.setIdleToken(idleToken);
    console.log("connIDLE.setIdleToken done");
};

module.exports.tags = ['setting','Connectors'];
