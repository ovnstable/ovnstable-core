const OvernightToken = artifacts.require("OvernightToken");

module.exports = async function(deployer) {
  //TODO: need to prevent redeploy on prom
  deployer.deploy(OvernightToken);

};
