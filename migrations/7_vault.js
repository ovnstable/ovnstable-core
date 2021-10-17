const Vault = artifacts.require("./Vault.sol")

module.exports = async function (deployer) {
    deployer.deploy(Vault);
};
