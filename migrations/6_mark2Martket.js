const Mark2Market = artifacts.require("./Mark2Market.sol");

module.exports = async function(deployer) {
  deployer.deploy(Mark2Market);
};
