const ConnectorAAVE = artifacts.require("./connectors/ConnectorAAVE.sol");
const ConnectorCurve = artifacts.require("./connectors/ConnectorCurve.sol");

module.exports = async function(deployer) {
  deployer.deploy(ConnectorAAVE);
  deployer.deploy(ConnectorCurve);
};
