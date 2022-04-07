const { deployProxy } = require("../../common/utils/deployProxy");

module.exports = async ({deployments}) => {
    const {save} = deployments;
    await deployProxy('PortfolioManager', deployments, save);
};

module.exports.tags = ['base','PortfolioManager'];
