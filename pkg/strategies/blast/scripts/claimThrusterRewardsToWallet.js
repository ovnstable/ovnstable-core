const hre = require("hardhat");
const { getContract, showM2M, execTimelock, getPrice, initWallet, transferETH, getERC20ByAddress } = require("@overnight-contracts/common/utils/script-utils");
const path = require('path');

const {BASE, COMMON, BLAST} = require('@overnight-contracts/common/utils/assets');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {
    let thrusterSwap = await getContract('StrategyThrusterSwap', 'localhost'); 
    let gas = {
        gasLimit: 20000000,
        // maxFeePerGas: "38000000",
        // maxPriorityFeePerGas: "1300000",
    }


    const unitAddress = "0xb8f55cdd8330b9bf9822137Bc8A6cCB89bc0f055";
    const provider = new ethers.providers.JsonRpcProvider(
        "http://localhost:8545"
    );
    await provider.send("hardhat_impersonateAccount", [unitAddress]);
    const unitAccount = await provider.getSigner(unitAddress); 
    // await transferETH(10, "0x086dFe298907DFf27BD593BD85208D57e0155c94");

    let usdb = await getERC20ByAddress(BLAST.usdb);
    let amountFrom = await usdb.balanceOf(COMMON.rewardWallet);
    console.log("DEBUG: amountFrom =", amountFrom.toString());

    await thrusterSwap.connect(unitAccount).claimMerkl(
        ["0x147812C2282eC48512a6f6f11F7c98d78D1ad74B"], // users
        ["0xE36072DD051Ce26261BF50CD966311cab62C596e"], // tokens
        ["23219651603805000000000"],                   // amounts
        [                                               // proofs
            [
                "0xc19e0d16c95fe56cde0290a5293bca751f17407d0ea1fdaf6b5f84e02c780fa1",
                "0x1034d3fe52694da11046f5e3a8bbde65ea4bb6d4ecbdd376f8b083cbe350bc46",
                "0x2b7da01215a396aad4f9f2fd08a5045dc4073fad3596f26209dcb293ced7243e",
                "0x4f32a5e302acadc89e7d4cc8f3fcd48bd4b0226d130a87af63eac5483e5f0e12",
                "0x84d951ecf6514ff40a15c059093115b1ff901034dcba009711e933b06fba6118",
                "0xadc696d5203a8b20b278970d179f21c9f4c5d6be2b51950fb76a1c5bf98b9ea0",
                "0x882f7ee86c1fec711d0dc44a6a53e6f17ca5007d9e5677863afda89b389e6ce5",
                "0x13c5012a08a636c406d9c67be4e0be539f599404466adb2e619519bb71d8c7e4",
                "0x412348f1fef3b33aed5905a8a4e8747d71478c74bd6b22e4b8fbb62ae2a36b81",
                "0x96798c60e2b37c4eb063880dd6062b761f0434855d388f4e97ff26c9b6eac339",
                "0x5f0005dce059713859c78470d14abe73362a7200124bf0128abc9c32b03ba383",
                "0xe7f1c6763bd2c1cfea2a7bbe8a9de075c5131eed9937fcda7be6540b3f460ad1",
                "0xb064a7a5800b3bb3a4806415afc8014fd5a2254c070e7e21be385c5ad7dbb119",
                "0xba2d21bba65b1e809bc5e2707f9ae8bc4a27854ba0646af9d9fad7392e51f55c",
                "0x3c1a69352af20d1a132158e311f503291d532ee95ee82441c6cbaa5ff64293b0",
                "0xb993350c8e68f573d060572a26035a4c3450eacfeb21a93d54532d49e79c7d41",
                "0xd368fa33e94407274c7ae98a5c691167597838d84dba660de8d3d6e231155c6c"
            ]
        ]
    , gas);


    let amountTo = await usdb.balanceOf(COMMON.rewardWallet);
    console.log("DEBUG: amountTo =", amountTo.toString());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });