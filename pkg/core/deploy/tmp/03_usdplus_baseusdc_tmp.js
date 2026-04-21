const { deployProxyMulti } = require("@overnight-contracts/common/utils/deployProxy");

// Deploys UsdPlusToken_BaseUsdc_Tmp impl against existing base_usdc UsdPlusToken proxy.
//
// Usage:
//   localhost (test):
//     cd pkg/core
//     STAND=base_usdc hh deploy --tags UsdPlusTokenBaseUsdcTmp --impl --network localhost
//   prod (real Base):
//     cd pkg/core
//     STAND=base_usdc hh deploy --tags UsdPlusTokenBaseUsdcTmp --impl --network base_usdc
module.exports = async ({ deployments }) => {
    const impl = await deployProxyMulti(
        "UsdPlusToken",
        "UsdPlusToken_BaseUsdc_Tmp",
        deployments,
        deployments.save,
        {}
    );
    console.log(`UsdPlusToken_BaseUsdc_Tmp impl: ${impl}`);
};

module.exports.tags = ["UsdPlusTokenBaseUsdcTmp"];
