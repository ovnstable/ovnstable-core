const ActivesList = artifacts.require("./registres/ActivesList.sol");

module.exports = async function(deployer) {
  deployer.deploy(ActivesList);

};
