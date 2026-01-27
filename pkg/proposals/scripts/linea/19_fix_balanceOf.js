const { getContract } = require("@overnight-contracts/common/utils/script-utils");
const { testProposal, createProposal } = require("@overnight-contracts/common/utils/governance");
const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));


async function main() {

  let addresses = [];
  let values = [];
  let abis = [];

  const UsdPlusToken = await getContract('UsdPlusToken', 'linea');
  const UsdtPlusToken = await getContract('UsdPlusToken', 'linea_usdt');

  const newImplUsdPlus = "0x5E32492347ca10B8418F971F66C84E9EC7b1ae40";  // change it after deploy to the correct one

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
