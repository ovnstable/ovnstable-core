const hre = require("hardhat");
const { getContract, showM2M, execTimelock, getPrice, initWallet, transferETH, getERC20ByAddress } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const path = require('path');
const { prepareEnvironment } = require("@overnight-contracts/common/utils/tests");
const { strategySiloUsdc } = require("@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc");
const { ethers } = require("hardhat");
const { strategyMorphoAlpha } = require("@overnight-contracts/strategies-base/deploy/22_strategy_morpho_alpha");
const { strategyMorphoBeta } = require("@overnight-contracts/strategies-base/deploy/24_strategy_morpho_beta");
const { strategyMorphoDirect } = require("@overnight-contracts/strategies-base/deploy/23_strategy_morpho_direct_alpha");
const {BASE, COMMON} = require('@overnight-contracts/common/utils/assets');
const {getImplementationAddress} = require('@openzeppelin/upgrades-core');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let wallet = await initWallet();
    // await transferETH(1, wallet.address);
    
    let addresses = [];
    let values = [];
    let abis = [];

    let rm = await getContract('RoleManager', 'base');
    let timelock = await getContract('AgentTimelock', 'base');
    
    let morphoAlpha = await getContract('StrategyMorphoAlpha', 'base');
    let morphoBeta = await getContract('StrategyMorphoBeta', 'base'); 
    let morphoDirect = await getContract('StrategyMorphoDirect', 'base');
    
    addProposalItem(rm, 'grantRole', [Roles.PORTFOLIO_AGENT_ROLE, timelock.address]);
    
    let newMorphoAlphaImpl = "0xeb05E0B2ed461cB9A24042F0888D5911b6C3E302";  
    let newMorphoBetaImpl = "0xBa2a670c5C289Ba58af2711D1abcBA34c1d19264";
    let newMorphoDirectImpl = "0xA21193B9a945d96445b00b84B8e7345E9084951A";

    
    addProposalItem(morphoAlpha, 'upgradeTo', [newMorphoAlphaImpl]);
    addProposalItem(morphoBeta, 'upgradeTo', [newMorphoBetaImpl]);
    addProposalItem(morphoDirect, 'upgradeTo', [newMorphoDirectImpl]);

    addProposalItem(morphoAlpha, 'setParams', [strategyMorphoAlpha()]);
    addProposalItem(morphoBeta, 'setParams', [strategyMorphoBeta()]);
    addProposalItem(morphoDirect, 'setParams', [strategyMorphoDirect()]);
    
    

    let well = await getERC20ByAddress(BASE.well, wallet.address);
    let usdc = await getERC20ByAddress(BASE.usdc, wallet.address);
    let morphoToken = await getERC20ByAddress(BASE.morphoToken, wallet.address);

    console.log("alpha well", (await well.balanceOf(morphoAlpha.address)).toString());
    console.log("beta well", (await well.balanceOf(morphoBeta.address)).toString());
    console.log("treasury well", (await well.balanceOf(COMMON.rewardWallet)).toString());
    console.log("direct well", (await well.balanceOf(morphoDirect.address)).toString());

    console.log("alpha usdc", (await usdc.balanceOf(morphoAlpha.address)).toString());
    console.log("beta usdc", (await usdc.balanceOf(morphoBeta.address)).toString());
    console.log("treasury usdc", (await usdc.balanceOf(COMMON.rewardWallet)).toString());
    console.log("direct usdc", (await usdc.balanceOf(morphoDirect.address)).toString());

    console.log("alpha morpho", (await morphoToken.balanceOf(morphoAlpha.address)).toString());
    console.log("beta morpho", (await morphoToken.balanceOf(morphoBeta.address)).toString());
    console.log("treasury morpho", (await morphoToken.balanceOf(COMMON.rewardWallet)).toString());
    console.log("direct morpho", (await morphoToken.balanceOf(morphoDirect.address)).toString());


    let dataAlpha = ["0x6b89026a0000000000000000000000009e3380f8b29e8f85ca19effa80fb41149417d9430000000000000000000000002e99704871c726893c94bbe7e5ba4c2bed976a86000000000000000000000000a88594d404727625a9437c3f886c7643872296ae000000000000000000000000000000000000000000030e8195e45da420db1a1e00000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000f6ab0eb563675c8b549065b0df7be410c02c2dd21562d35e26098e201d1fec21684266961a4e29dd894a25162c21e471b9364d229c94bb3bb9e839a1666a3adbfd90eb0d80964de6c31ebe351e36b077a7ad2ec24255bde5f178eba7ca7f50404e5cba034f7ac0eda2fb32e043e24402b51ebd25a5a6bb65b245db009a3f307fcad8d3401069d466fe29966a609eb3aaf5aa98748b0b877c25ca3289d42ccaadbdd71ecd9a932d86bdb147f696f8f07b070a37333e8da613d546c59a2c1f6c27aac596e904373c43394bdba6512ac0bc4082548976cc5980779b70f35394395cecbe52533384fff8d3dbfbd885d68fd0bf63beaf77ccbdf7778f2b4ac541e908e8bb8ee4a326d636ea1d8e1ad70bf37e017068b5c7ba595c3b68ab26aa034ee35ad5ba424904d46f912635db190f02d39a3d8a32d2fe37d63c984655a65add7dc6c222467816759010478b4dc08025858c3cd40c9bc3eb0132b9995ad22ba83266efb960f6cc6d2b280490621e63b76c0e8b0b318067119a1a9f89edec8163f8f64569a8948daed8d21a6054e179747b40a79d42808a0380a9e5ce06389a6574159f604be41a70fee7e74dc31d0e0786fe06db2b78820941fcf9ee5763bfc4596f7bc2e06b4b28ac61824a45c570a06ad99fd5332ac2c12cb8f7f4204bb041346", 
        "0x6b89026a0000000000000000000000005400dbb270c956e8985184335a1c62aca6ce13330000000000000000000000002e99704871c726893c94bbe7e5ba4c2bed976a86000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda029130000000000000000000000000000000000000000000000000000000052b004fe00000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000ff9a90457f52796cb51898d2f704c81fe5ce7417585c6c1f8acb84ff56f0602abe1d0093de014edb1ae83560414665bcb44dc2cb2f00bbe524ca99e0a4c69c2ec2cf1a18ebb3fe2d1ef499545f8c60ffe92ba8be891734af1f8816762f19f0dfd58e7b005e20000178cf7379b4a18f364724d582acb7984228a540758ab347eddd41d5f2cf1c9b36e2e50dcccacf71ba6423cd24e3c6662c4bcd17b374b8fbef6f36379a71c4dda9454b458fd660c70bcd69e8c5e1e8c5e98e310b9dfa33e848417a97c9852e33348ea5e822bc373ccdfd4101fb47b57107d27170da15596001a612e2916380c7f2bf6276cb708e9733cdb1fc8926adf84b7a1900b4bbf09bb1f53e9b514b305e07af78b1407815a89452a8033cb569935240e96a4ef5e7d0779d032ef367b61312af66f84913599ff82e7571442f707361c22ab44ce8f4845b621ab11aedbaf4a72b3f57fe5f52ebd6ad61016965123e8640848d6871843bd36a368b490806b9685bbc52f645a1c666c0eb3e22049439b3ce6a2f3e5bfd08302298bc82227858fce06541224a82f73201e690c99f778b26faf353416824c6fa54827058a333ce3387e3e5b6324c24357af75ec5b5ecf79a3971b8c87e10f2177634d61f8bd17905302b7950041685f9895b3cc2336cb02ea15152005a42391b4",
        "0x6b89026a0000000000000000000000005400dbb270c956e8985184335a1c62aca6ce13330000000000000000000000002e99704871c726893c94bbe7e5ba4c2bed976a86000000000000000000000000baa5cc21fd487b8fcc2f632f3f4e8d37262a084200000000000000000000000000000000000000000000180d65d0bca3dd851d6f00000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000010c6ad7049e2bc644ba6e5628527a2bed4442a3b6b5efb708f900f3fffc9c4d04d953eae067d74a7bdeb18d956c07185c479ece61dc9a806b71f79963057e21347616bf29ddc7729579a29c1aa9b3fcb7a5b78943c00a0f08b672a763a30dffe1e3824a120ac20f5c155dccf09a7ec84771107e033cf32f41571d896b9bf80ad1a9c53c50833edabc5936c15d530cc97c9282e259867dc8acfd83f7f2ae73010b14385614aee43fd3f703cd9c631c132dbd8448b4000d31b2f55e3892bf57c42f009ddbdf0c1a94533ba212468b2c51c862b4268c372da4c7653b8cdf7772fab402165bb0f57f540649e1f466121e3607df8c4412d1b73576f75392d8ac8b6e37a24747831265f1be366abc0fb0dcfed3df3b491f4a9acd60dc871907b0b0facfac5fca97cd93f936606f939720e68895871051fdc892bb7ced81c1e22f9c35c69a40d96f16dba382951480507de469ce1b961cc8e46fe430ef1b963d48edb935a121850dc5038e6d8f5ab0f5a8c975fd07876b37fb48348740bb15d7bc6b51b41c82015862de521536646ae5bde9c7fe4a05f8b8c58f8de31f8c18d639abe27f89ce5b2bec40e4ba9a9b6832d79f2667ffe8ef440a50675125c238900017a5edb6f9fb219cc72b60715f4ec24e4b84231d0fdf5aaaaf7d863c3fc68aa41d2ab19faef67e355cf50b5c58e014a4a2d69f64061cb2ba39c57f81770d2f24f7e6211"
    ]

    let dataBeta = [
        "0x6b89026a0000000000000000000000005400dbb270c956e8985184335a1c62aca6ce1333000000000000000000000000e1d2e5d59f8802b0249ea12d9ac94249d6bff17c000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda029130000000000000000000000000000000000000000000000000000000097997b3100000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000101d3ede79848208feb175c1493da6fef25347cd002054bdc560a25d81ea821b7e5471e53177386c8bd4406864ee9a715cc8facdc845828d26b93d496594bfd68af3a2a6e2781df08816164c9d7af4fbf9df330c5289f92265b8af0029322a25164aadeddc98c461ece13a8f27c03846b476657c2709573f8ea442c4085b1e7d974fd0f9fa92e082a1d6c0a7b7b312236eaeedc5151d842ab1f0d72047662bab5a4cea0ba0f976539209fb545fdc7eec86ad6c942360cf518410705d29a360dcf039748c5eed701fae8a1a8363c6b7c76221f540b758cb16398afc54e19d703767791e9ccb6687ee1d80461123de8c9eb3ead66211f427694059a9dc28c6d8113f04a53158f937c12027b83b194e73c6a0d15700c92ff9b847aeba310412a41a69b90f0a947f4c03f3366ecc68f06b3c00df43435c318e11dbd3ef922e038fdda1ef5795ef6ca30927bb26eedbf04de7219799732f89f4f225e651241437187b60df0231c82685c86c61bee69b3de97fc1d7a222224f61b73f67d8ddb0c99d3e5c54c4f1c86b83c7d93872efeff59a9989377e955ba5ae34299ffd7e2a4085c7926c7c151d0160b3e5aa12b5e48fa418deadeb26de9c93686fccedd12fc4d9fd0d761b31bbb52aa19b0eef05caa7095a739bc543b356f80fde0d1d3d42929a279f634d61f8bd17905302b7950041685f9895b3cc2336cb02ea15152005a42391b4",
        "0x6b89026a0000000000000000000000005400dbb270c956e8985184335a1c62aca6ce1333000000000000000000000000e1d2e5d59f8802b0249ea12d9ac94249d6bff17c000000000000000000000000baa5cc21fd487b8fcc2f632f3f4e8d37262a0842000000000000000000000000000000000000000000000631860628eb2a5023c200000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000010a19e2fab67f46c5b8a5517113e7eceb03d51bb146606ab8254a4c8f7ff2f7b5881159386a66560f78f8708d831d814cc0be8d768ad6c3c276ace37ad9aa589c8adecfe3c7a93d2852dacabc8d104ad319d6c450d5b4c148de0925ae31ca9125d29919c3d4c0296eb5079b8be12a45d0a60d0bbbf864323bff0d9d57912812c5324fb1414b91dfac0c28f1258a7bec6145c3659561807c342be6fb9f7ccdbb8d92acbf40b9a95859ed75bf5e86950aa908fa8c756bdae865046bfef9a1a724561519590ef006659ec87b0ebdfcd2608afe67cf48188bfe8aa44d47a5b7f79d13e57495d42857b1e90050a1026db787f58ee4d74967489f680f5987c6176771c0a64c2c0ab7303273d85b47e5d43da68e0f22548eed7a977d049740c227fbbdf47ef4c901ffd4e82e96150b9192916bd0845ec680291d3bde66b6ccd75e3df6401031ba3e0d2708022d8873267346eae9445424cd17f6a93d23e90e06ad0fb822807f458e2a82872a294de39ec145f4b89f0fd79fca0af0c3636f10f223d4f1593f2e023d3c5614ce5c2916986d803b4dcaa55f7241a6be75f4115d4ca323c7decbda8d5b4a55f47a0cbcede3b473700f6c5e333ce02b6291cd9b6c3f21572ad106f9fb219cc72b60715f4ec24e4b84231d0fdf5aaaaf7d863c3fc68aa41d2ab19faef67e355cf50b5c58e014a4a2d69f64061cb2ba39c57f81770d2f24f7e6211"
    ]

    let dataDirect = ["0x6b89026a0000000000000000000000005400dbb270c956e8985184335a1c62aca6ce1333000000000000000000000000fac13ccd9216c0001fb4cd1ec59e90bbcf843ba4000000000000000000000000baa5cc21fd487b8fcc2f632f3f4e8d37262a08420000000000000000000000000000000000000000000012a98fdeac55eed2f1ae00000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000ffecc73b5e6aadbcf44250e461135abb84f84b576e7d6dd21cc84d0d1a5076f4da802d6a24b635cace6a64682368753207f84d891be08c66483ee7cfd1d583fe268cb7be27cc0fdec825506d027937bd02f37e41733516d12d44394db016033e1bd2944013341c3d845d8b292e93983abf756e6635e5728fc2a0b59b9ce765ac6a3a60b7deac36d2ada66a0d0a9de8b423b2c0f55fc5350dc8c4dcc9f42254dddaea16fa270b22f5e6a22b5afffd9be98302f4b8e5a24e8054b318447971bfcd7e82da1aa1ca67d61e546aac1d59900d82a174efb0dfd690aa06fa0a6d2d20eb6264382ccb5d51eec2c2b7aea69c992cf0f215dfd2554fb86939520f7027c0a5556b5d97d84cde555dfe97ba7c0bcf84fefb1e679d6d223ba705eefe9a31ede98b7932049076012e9c41f89bb5bcc879e38ecb97b61932dcbe5256a5c898014c5284db06ad0c537bc7f7cbcb3b81366ced2adda324d03fc0fba4c12982346d992a368b490806b9685bbc52f645a1c666c0eb3e22049439b3ce6a2f3e5bfd08302298bc82227858fce06541224a82f73201e690c99f778b26faf353416824c6fa54827058a333ce3387e3e5b6324c24357af75ec5b5ecf79a3971b8c87e10f2177634d61f8bd17905302b7950041685f9895b3cc2336cb02ea15152005a42391b4"]


    addProposalItem(morphoDirect, 'claimMerkleTreeRewards', [COMMON.rewardWallet, dataDirect, BASE.morphoChainAgnosticBundler]);
    addProposalItem(morphoAlpha, 'claimMerkleTreeRewards', [COMMON.rewardWallet, dataAlpha, BASE.morphoChainAgnosticBundler]);
    addProposalItem(morphoBeta, 'claimMerkleTreeRewards', [COMMON.rewardWallet, dataBeta, BASE.morphoChainAgnosticBundler]);
    

    

    // await testProposal(addresses, values, abis);
    // await testUsdPlus(filename, 'base');
    // await testStrategy(filename, morpho, 'base');
    await createProposal(filename, addresses, values, abis);

    console.log("alpha morpho", (await morphoToken.balanceOf(morphoAlpha.address)).toString());
    console.log("beta morpho", (await morphoToken.balanceOf(morphoBeta.address)).toString());
    console.log("treasury morpho", (await morphoToken.balanceOf(COMMON.rewardWallet)).toString());
    console.log("direct morpho", (await morphoToken.balanceOf(morphoDirect.address)).toString());

    console.log("alpha well", (await well.balanceOf(morphoAlpha.address)).toString());
    console.log("beta well", (await well.balanceOf(morphoBeta.address)).toString());
    console.log("treasury well", (await well.balanceOf(COMMON.rewardWallet)).toString());
    console.log("direct well", (await well.balanceOf(morphoDirect.address)).toString());

    console.log("alpha usdc", (await usdc.balanceOf(morphoAlpha.address)).toString());
    console.log("beta usdc", (await usdc.balanceOf(morphoBeta.address)).toString());
    console.log("treasury usdc", (await usdc.balanceOf(COMMON.rewardWallet)).toString());
    console.log("direct usdc", (await usdc.balanceOf(morphoDirect.address)).toString());



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

