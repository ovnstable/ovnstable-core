const { getContract, showM2M } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let pm = await getContract('PortfolioManager', 'arbitrum');
    let usdPlus = await getContract('UsdPlusToken', 'arbitrum');
    let alpha = await getContract('StrategySperAlpha', 'arbitrum');
    let gamma = await getContract('StrategySperGamma', 'arbitrum');

    // console.log("pm", await pm.getAllStrategyWeights());

    console.log("alpha", alpha.address);
    console.log("gamma", gamma.address);


    let plusImplNew = "0xFccdF32e4F3E08e40425986Ae298245e1A46E112";
    let plusImplOld = "0x53c905E4fbE64bd03c15CD16b330D2Cc20EcA4E5";

    



    let dev6 = "0x68f504f38a5E6C04670883739d34538Fd66aC990";
    let timelock = "0xa44dF8A8581C2cb536234E6640112fFf932ED2c4";
    
    addProposalItem(pm, 'removeStrategy', [alpha.address]);

    let weights = [
        {
          strategy: '0x5c87238A7C3A98Ff4210Bc192dEB9e567cA6dFE1',
          minWeight: 0,
          targetWeight: 100000,
          maxWeight: 100000,
          riskFactor: 0,
          enabled: true,
          enabledReward: true
        },
        {
          strategy: '0x135478A4729901651f106fD0Dc112b0FBdD670cf',
          minWeight: 0,
          targetWeight: 0,
          maxWeight: 100000,
          riskFactor: 0,
          enabled: false,
          enabledReward: false
        }
      ];


    addProposalItem(pm, 'setStrategyWeights', [weights]);

    addProposalItem(pm, 'removeStrategy', [gamma.address]);

    addProposalItem(usdPlus, 'upgradeTo', [plusImplNew]);

    addProposalItem(usdPlus, 'burnTreasury', []);

    addProposalItem(usdPlus, 'upgradeTo', [plusImplOld]);





    
    // await testProposal(addresses, values, abis);
    await createProposal(filename, addresses, values, abis);

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

