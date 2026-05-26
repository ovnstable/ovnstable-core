const { deployProxyMulti } = require("@overnight-contracts/common/utils/deployProxy");

// Deploys UsdPlusToken_BaseOvn_Tmp impl against existing base_ovn UsdPlusToken proxy.
//
// Usage:
//   localhost (test):
//     cd pkg/core
//     STAND=base_ovn hh deploy --tags UsdPlusTokenBaseOvnTmp --impl --network localhost
//   prod (real Base):
//     cd pkg/core
//     STAND=base_ovn hh deploy --tags UsdPlusTokenBaseOvnTmp --impl --network base_ovn
module.exports = async ({ deployments }) => {
    const impl = await deployProxyMulti(
        "UsdPlusToken",
        "UsdPlusToken_BaseOvn_Tmp",
        deployments,
        deployments.save,
        {}
    );
    console.log(`UsdPlusToken_BaseOvn_Tmp impl: ${impl}`);
};

module.exports.tags = ["UsdPlusTokenBaseOvnTmp"];
