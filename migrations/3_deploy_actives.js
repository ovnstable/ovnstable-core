
const Mark2Market = artifacts.require("./Mark2Market.sol");
const USDCtest = artifacts.require("./USDCtest.sol");
const aUSDCtest = artifacts.require("./aUSDCtest.sol");
const ActivesList = artifacts.require("./registres/ActivesList.sol");
const ConnectorAAVE = artifacts.require("./connectors/ConnectorAAVE.sol");
const ConnectorCurve = artifacts.require("./connectors/ConnectorCurve.sol");

module.exports = async function(deployer) {

const chainID = await web3.eth.net.getId();

activesListdepl = ActivesList.networks
const actList = await ActivesList.deployed();// at(ActivesList.networks[chainID]['address']);
const m2m = await Mark2Market.deployed();// at(Mark2Market.networks[chainID]['address']);

if (chainID == '80001') {
    // https://docs.aave.com/developers/deployed-contracts/matic-polygon-market
  USDC = USDCtest.networks[chainID]['address'];
  aUSDC = aUSDCtest.networks[chainID]['address'];

  } else {
    USDC = USDCtest.networks[chainID]['address'];
    aUSDC = aUSDCtest.networks[chainID]['address'];

  }

  const connectorAv = ConnectorAAVE.networks[chainID]['address'];
  //await actList.actAdd(aUSDC, connectorAv,connectorAv, "2500", "9500", "10000000000000000000");
  await actList.actAdd(USDC, connectorAv,connectorAv, "2500", "9500", "10000000000000000000");

  const connectorCv = ConnectorCurve.networks[chainID]['address'];
  //await actList.actAdd(aUSDC, connectorCv,connectorCv, "2500", "9500",  "20000000000000000000");
  await m2m.tstPrice ("1");
  const actives = await m2m.activesPrices ();
  console.log (actives[0]);
}
