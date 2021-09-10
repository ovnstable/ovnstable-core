const PortfolioManager = artifacts.require("./PortfolioManager.sol")

module.exports = async function(deployer) {
  deployer.deploy(PortfolioManager);
};
