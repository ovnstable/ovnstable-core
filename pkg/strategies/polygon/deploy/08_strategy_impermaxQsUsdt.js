const {deployProxyMulti} = require("../../../common/utils/deployProxy");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deployProxyMulti('StrategyImpermaxQsUsdcUsdt', 'StrategyImpermaxQsUsdt', deployments, save);

    // Uncomment for individual deploy
    // await deployProxyMulti('StrategyImpermaxQsMaticUsdt', 'StrategyImpermaxQsUsdt', deployments, save);
    // await deployProxyMulti('StrategyImpermaxQsWethUsdt', 'StrategyImpermaxQsUsdt', deployments, save);
    // await deployProxyMulti('StrategyImpermaxQsMaiUsdt', 'StrategyImpermaxQsUsdt', deployments, save);
};

module.exports.tags = ['base', 'StrategyImpermaxQsUsdt'];
