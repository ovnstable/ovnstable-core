    const hre = require("hardhat");
    const {getContract, showM2M, execTimelock, initWallet, transferETH} = require("@overnight-contracts/common/utils/script-utils");
    const {createProposal, testProposal, testUsdPlus, testStrategy} = require("@overnight-contracts/common/utils/governance");
    const {Roles} = require("@overnight-contracts/common/utils/roles");
    const {prepareEnvironment} = require("@overnight-contracts/common/utils/tests");
    const {strategySiloUsdc} = require("@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc");
    const {ethers} = require("hardhat");
    const path = require('path');
    let filename = path.basename(__filename);
    filename = filename.substring(0, filename.indexOf(".js"));

    async function main() {

        // let mainAddress = (await initWallet()).address;
        // await transferETH(100, mainAddress);   

        let addresses = [];
        let values = [];
        let abis = [];

        let ex = await getContract('Exchange', 'base');
        let usdPlus = await getContract('UsdPlusToken', 'base');

        let daiEx = await getContract('Exchange', 'base_dai');
        let daiPlus = await getContract('UsdPlusToken', 'base_dai');

        let usdcEx = await getContract('Exchange', 'base_usdc');
        let usdcPlus = await getContract('UsdPlusToken', 'base_usdc');

        const exNew = '0xde48c03B452ACba30d297dF21A5C8676FeA7b3D2';
        const usdPlusNew = '0x1F7e713B77dcE6b2Df41Bb2Bb0D44cA35D795ed8';

        addProposalItem(ex, "upgradeTo", [exNew]);
        addProposalItem(usdPlus, "upgradeTo", [usdPlusNew]);

        addProposalItem(daiEx, "upgradeTo", [exNew]);
        addProposalItem(daiPlus, "upgradeTo", [usdPlusNew]);

        addProposalItem(usdcEx, "upgradeTo", [exNew]);
        addProposalItem(usdcPlus, "upgradeTo", [usdPlusNew]);

        addProposalItem(daiEx, "setDeprecated", [true]);

        
        
        // await testProposal(addresses, values, abis);
        // console.log("CHECK: ", (await ex.getAvailabilityInfo()).toString());
        // console.log("CHECK: ", (await daiEx.getAvailabilityInfo()).toString());
        // console.log("CHECK: ", (await usdcEx.getAvailabilityInfo()).toString());
        // await testUsdPlus(filename, 'base');
        // await testUsdPlus(filename, 'base_dai');
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

