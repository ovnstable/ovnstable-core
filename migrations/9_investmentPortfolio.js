const InvestmentPortfolio = artifacts.require("./regetries/InvestmentPortfolio.sol")

module.exports = async function (deployer) {
    deployer.deploy(InvestmentPortfolio);
};
