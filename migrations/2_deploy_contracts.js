const OvernightToken = artifacts.require("OvernightToken");

module.exports = function(deployer) {
  deployer.deploy(OvernightToken);
};
