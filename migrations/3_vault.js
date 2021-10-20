const Vault = artifacts.require("./Vault.sol")

module.exports = async function (deployer) {
    //TODO: need to prevent redeploy on prom
    deployer.deploy(Vault);
};
