const Exchange = artifacts.require("Exchange");

module.exports = async function(deployer) {
  deployer.deploy(Exchange);
};
