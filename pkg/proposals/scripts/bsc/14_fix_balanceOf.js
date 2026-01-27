const { getContract } = require("@overnight-contracts/common/utils/script-utils");
const { testProposal, createProposal } = require("@overnight-contracts/common/utils/governance");
const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));


async function main() {

  let addresses = [];
  let values = [];
  let abis = [];

  const UsdPlusToken = await getContract('UsdPlusToken', 'bsc');
  const UsdtPlusToken = await getContract('UsdPlusToken', 'bsc_usdt');

  const newImplUsdPlus = "0x1aA5249D0A70f70E4696931fEDB66c3C9a1093B7";  // change it after deploy to the correct one

  addProposalItem(UsdPlusToken, 'upgradeTo', [newImplUsdPlus]);
  addProposalItem(UsdtPlusToken, 'upgradeTo', [newImplUsdPlus]);

  // await testProposal(addresses, values, abis);
  await createProposal(filename, addresses, values, abis);

  // ========================================================================

  function addProposalItem(contract, methodName, params) {
    addresses.push(contract.address);
    values.push(0);
    abis.push(contract.interface.encodeFunctionData(methodName, params));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
