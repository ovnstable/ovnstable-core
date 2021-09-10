const OvernightToken = artifacts.require("OvernightToken");

module.exports = async function(deployer) {

  deployer.deploy(OvernightToken);

};
