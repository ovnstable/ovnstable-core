const { assert } = require("console");

const Mark2Market = artifacts.require("./Mark2Market.sol");
const USDCtest = artifacts.require("./USDCtest.sol");
const aUSDCtest = artifacts.require("./aUSDCtest.sol");
const ActivesList = artifacts.require("./registres/ActivesList.sol");
const ConnectorAAVE = artifacts.require("./connectors/ConnectorAAVE.sol");
const ConnectorCurve = artifacts.require("./connectors/ConnectorCurve.sol");

//const ConnectorAAVE = artifacts.require("./connectors/ConnectorAAVE.sol");

var USDC, aUSDC

/**
 * 1. adding aUSDC to active list
 * 2. get price for aUSDC
 */


contract ("Mark2Market test", async accounts => {
  const chainID = await web3.eth.net.getId();
  activesListdepl = ActivesList.networks
  const actList = await ActivesList.at(ActivesList.networks[chainID]['address']);
  const m2m = await Mark2Market.at(Mark2Market.networks[chainID]['address']);


if (chainID == '80001') {
  // https://docs.aave.com/developers/deployed-contracts/matic-polygon-market
  USDC = "0x2058A9D7613eEE744279e3856Ef0eAda5FCbaA7e";
  aUSDC = "0x2271e3Fef9e15046d09E1d78a8FF038c691E9Cf9";

} else {
  USDC = USDCtest.networks[chainID]['address'];
  aUSDC = aUSDCtest.networks[chainID]['address'];

}
console.log ("starting  tests")
debugger
    it ("add aUSDc ", async () => { 
      
      const connectorS = ConnectorAAVE.networks[chainID]['address'];
      await actList.actAdd(aUSDC, connectorS,connectorS, 2500, 9500, 1, 10**22);
      console.log (await actList.getActive (aUSDC));
      debugger
      assert (false, "test")

    }) ,
  
    it ("aUSDc price", async () => { 
      console.log (await m2m.prices());
      debugger
      assert (false, "test")

    }) ,
    
    it ("Curve price", async () => { }) 
   
  
  })
 