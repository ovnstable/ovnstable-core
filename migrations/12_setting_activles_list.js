const ActivesList = artifacts.require("./registres/ActivesList.sol");
const ConnectorAAVE = artifacts.require("./connectors/ConnectorAAVE.sol");
const ConnectorCurve = artifacts.require("./connectors/ConnectorCurve.sol");
var USDC, aUSDC, DAI, aDAI, aCurveLP, aCurvepoolStake, metaCurvepoolPrice, metaCurvepoolStake

module.exports = async function (deployer) {

    const chainID = await web3.eth.net.getId();

    const actList = await ActivesList.deployed();

    USDC = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"
    aUSDC = "0x1a13F4Ca1d028320A707D99520AbFefca3998b7F"
    DAI = "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063"
    aDAI = "0x27F8D03b3a2196956ED754baDc28D73be8830A6e"
    aCurveLP = "0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171"
    aCurvepoolStake = "0x445FE580eF8d70FF569aB36e80c647af338db351"
    metaCurvepoolPrice = "0x751B1e21756bDbc307CBcC5085c042a0e9AaEf36"
    metaCurvepoolStake = "0xDeBF20617708857ebe4F679508E7b7863a8A8EeE"

    const connectorAv = ConnectorAAVE.networks[chainID]['address'];
    const connectorCrv = ConnectorCurve.networks[chainID]['address'];

    await actList.actAdd(USDC, connectorAv, connectorAv, connectorAv, "500", "1000", "0", [aUSDC, aCurveLP]);
    await actList.actAdd(aUSDC, connectorCrv, aCurvepoolStake, aCurvepoolStake, "0", "5000", "0", [aCurveLP]);

    await actList.actAdd(DAI, connectorAv, connectorAv, connectorAv, "500", "1000", "0", [aDAI]);
    await actList.actAdd(aDAI, connectorAv, connectorAv, connectorAv, "2500", "9500", "0", []);
    await actList.actAdd(aCurveLP, connectorCrv, aCurvepoolStake, aCurvepoolStake, "0", "5000", "0", [aCurveLP]);
    // токен curve
    await actList.actAdd("0x172370d5cd63279efa6d502dab29171933a610af", connectorAv, connectorAv, connectorAv, "0", "5000", "0", []);
    // токен MATIC
    await actList.actAdd("0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270", connectorAv, connectorAv, connectorAv, "0", "5000", "0", []);

}

