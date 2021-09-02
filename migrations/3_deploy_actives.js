const Mark2Market = artifacts.require("./Mark2Market.sol");
const USDCtest = artifacts.require("./tests/USDCtest.sol");
const aUSDCtest = artifacts.require("./tests/aUSDCtest.sol");
const ActivesList = artifacts.require("./registres/ActivesList.sol");
const ConnectorAAVE = artifacts.require("./connectors/ConnectorAAVE.sol");
const ConnectorCurve = artifacts.require("./connectors/ConnectorCurve.sol");
var USDC, aUSDC, DAI, CurvepoolPrice, CurvepoolStake
module.exports = async function(deployer) {

const chainID = await web3.eth.net.getId();

activesListdepl = ActivesList.networks
const actList = await ActivesList.deployed();// at(ActivesList.networks[chainID]['address']);
const m2m = await Mark2Market.deployed();// at(Mark2Market.networks[chainID]['address']);

if (chainID == '80001') {
    // https://docs.aave.com/developers/deployed-contracts/matic-polygon-market
    USDC = "0x2058A9D7613eEE744279e3856Ef0eAda5FCbaA7e";
    aUSDC = "0x2271e3Fef9e15046d09E1d78a8FF038c691E9Cf9";

  } else if (chainID == 137) {
    USDC = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"
    aUSDC = "0x1a13F4Ca1d028320A707D99520AbFefca3998b7F"
    DAI = "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063"
    aDAI = "0x27F8D03b3a2196956ED754baDc28D73be8830A6e"
    aCurveLP = "0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171"
    aCurvepoolStake = "0x445FE580eF8d70FF569aB36e80c647af338db351"
    metaCurvepoolPrice = "0x751B1e21756bDbc307CBcC5085c042a0e9AaEf36"
    metaCurvepoolStake = "0xDeBF20617708857ebe4F679508E7b7863a8A8EeE"
  }

  else {
    USDC = USDCtest.networks[chainID]['address'];
    aUSDC = aUSDCtest.networks[chainID]['address'];

  }

  const connectorAv = ConnectorAAVE.networks[chainID]['address'];
  const connectorCrv = ConnectorCurve.networks[chainID]['address'];
  //await actList.actAdd(aUSDC, connectorAv,connectorAv, "2500", "9500", "10000000000000000000");
  await actList.actAdd(USDC,  connectorAv,connectorAv, connectorAv, "500", "1000", "0", [aUSDC, aCurveLP]);
  // await actList.actAdd(aUSDC,  connectorAv,connectorAv, connectorAv, "2500", "9500", "0",[] );
  await actList.actAdd(aUSDC, connectorCrv,aCurvepoolStake, aCurvepoolStake, "0", "5000", "0", [aCurveLP]);

  await actList.actAdd(DAI, connectorAv,connectorAv, connectorAv, "500", "1000", "0", [aDAI]);
  await actList.actAdd(aDAI, connectorAv,connectorAv, connectorAv, "2500", "9500", "0", []);
  await actList.actAdd(aCurveLP, connectorCrv,aCurvepoolStake, aCurvepoolStake, "0", "5000", "0", [aCurveLP]);
  // токен curve
  await actList.actAdd("0x172370d5cd63279efa6d502dab29171933a610af", connectorAv,connectorAv, connectorAv, "0", "5000", "0", []);
  // токен MATIC
  await actList.actAdd("0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270", connectorAv,connectorAv, connectorAv, "0", "5000", "0", []);
  /* await actList.actAdd("0x1d2a0E5EC8E5bBDCA5CB219e649B565d8e5c3360",  connectorAv,connectorAv, connectorAv, "0", "0", "0", []);
  await actList.actAdd("0x17912140e780B29Ba01381F088f21E8d75F954F9",  connectorAv,connectorAv, connectorAv, "0", "0", "0", []);
  await actList.actAdd("0x1c313e9d0d826662F5CE692134D938656F681350",  connectorAv,connectorAv, connectorAv, "0", "0", "0", []);
  await actList.actAdd("0x8dF3aad3a84da6b69A4DA8aeC3eA40d9091B2Ac4",  connectorAv,connectorAv, connectorAv, "0", "0", "0", []);
  await actList.actAdd("0x59e8E9100cbfCBCBAdf86b9279fa61526bBB8765",  connectorAv,connectorAv, connectorAv, "0", "0", "0", []);
  await actList.actAdd("0xb9A6E29fB540C5F1243ef643EB39b0AcbC2e68E3",  connectorAv,connectorAv, connectorAv, "0", "0", "0", []);
 */

  //await actList.actAdd(DAI, connectorCv,CurvepoolPrice, CurvepoolStake, "2500", "9500",  "20000000000000000000");
  // await m2m.tstPrice ("1");
  // const actives = await m2m.activesPrices ();
  // console.log (actives);

}

