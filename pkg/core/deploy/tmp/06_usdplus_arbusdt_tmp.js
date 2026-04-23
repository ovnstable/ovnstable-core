const { deployProxyMulti } = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async ({ deployments }) => {
    const impl = await deployProxyMulti(
        "UsdPlusToken",
        "UsdPlusToken_ArbUsdt_Tmp",
        deployments,
        deployments.save,
        {}
    );
    console.log(`UsdPlusToken_ArbUsdt_Tmp impl: ${impl}`);
};

module.exports.tags = ["UsdPlusTokenArbUsdtTmp"];
