const { deployProxyMulti } = require("@overnight-contracts/common/utils/deployProxy");

// Deploys UsdPlusToken_BaseDai_Tmp impl against existing base_dai UsdPlusToken proxy.
//
// Usage:
//   localhost (test):
//     cd pkg/core
//     STAND=base_dai hh deploy --tags UsdPlusTokenBaseDaiTmp --gov --impl --network localhost
//   prod (real Base):
//     cd pkg/core
//     STAND=base_dai hh deploy --tags UsdPlusTokenBaseDaiTmp --impl --network base_dai
//
// Flags:
//   --impl  : deploy implementation only (no upgradeTo). Required for prod (proposal will upgradeTo).
//   --gov   : on localhost, also impersonate timelock and call upgradeTo locally.
//             For our flow we don't want this — the proposal does upgradeTo itself.
//             Keep --impl WITHOUT --gov to mirror prod behavior.
module.exports = async ({ deployments }) => {
    const impl = await deployProxyMulti(
        "UsdPlusToken",
        "UsdPlusToken_BaseDai_Tmp",
        deployments,
        deployments.save,
        {}
    );
    console.log(`UsdPlusToken_BaseDai_Tmp impl: ${impl}`);
};

module.exports.tags = ["UsdPlusTokenBaseDaiTmp"];
