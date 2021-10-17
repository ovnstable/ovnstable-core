const Balancer = artifacts.require("./Balancer.sol")

module.exports = async function (deployer) {
    deployer.deploy(Balancer);
};
