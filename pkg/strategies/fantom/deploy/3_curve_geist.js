const {deployProxy} = require("../../../common/utils/deployProxy");


module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deployProxy('StrategyCurveGeist', deployments, save);
};

module.exports.tags = ['base', 'StrategyCurveGeist'];
