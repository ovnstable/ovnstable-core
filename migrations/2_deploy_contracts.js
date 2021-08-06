const OvernightToken = artifacts.require("OvernightToken");
const SimpleStorage = artifacts.require("SimpleStorage");
const Exchange = artifacts.require("Exchange");

module.exports = function(deployer) {
  deployer.deploy(OvernightToken);
  deployer.deploy(SimpleStorage);
  deployer.deploy(Exchange);
};
