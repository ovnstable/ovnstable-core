const {deployProxy} = require("../../common/utils/deployProxy");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deployProxy('StrategyCurve2Pool', deployments, save);
};

module.exports.tags = ['base', 'StrategyCurve2Pool'];
