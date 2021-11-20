const RewardManager = artifacts.require("./RewardManager.sol")

module.exports = async function (deployer) {
    deployer.deploy(RewardManager);
};
