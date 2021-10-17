const ConnectorAAVE = artifacts.require("./connectors/ConnectorAAVE.sol");
const ConnectorCurve = artifacts.require("./connectors/ConnectorCurve.sol");

module.exports = async function (deployer) {

    let usdc = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174";
    let aave = "0xd05e3E715d945B59290df0ae8eF85c1BdB684744";
    let aCurvepoolStake = "0x445FE580eF8d70FF569aB36e80c647af338db351"

    const connAAVE = await ConnectorAAVE.deployed();
    await connAAVE.setAAVE(aave, usdc);

    const connCurve = await ConnectorCurve.deployed();
    await connCurve.setUSDC(usdc, aCurvepoolStake);

};
