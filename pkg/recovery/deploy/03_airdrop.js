const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async ({ deployments }) => {
    const { save } = deployments;
    await deployProxy('Airdrop', deployments, save);

    console.log("Airdrop created");
};

module.exports.tags = ['airdrop'];
