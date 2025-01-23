const hre = require("hardhat");
const { getContract, showM2M, execTimelock, getPrice, initWallet, transferETH, getERC20ByAddress } = require("@overnight-contracts/common/utils/script-utils");
const path = require('path');

const {BASE, COMMON, BLAST} = require('@overnight-contracts/common/utils/assets');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {
    let fenixSwap = await getContract('StrategyFenixSwap', 'localhost'); 
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
    let amountFrom = await usdb.balanceOf(fenixSwap.address);
    console.log("DEBUG: amountFrom =", amountFrom.toString());

    await fenixSwap.connect(unitAccount).claimMerkl(
        ["0xa09A8e94FBaAC9261af8f34d810D96b923B559D2"], // users
        ["0x52f847356b38720B55ee18Cb3e094ca11C85A192"], // tokens
        ["758649110431330000000000"],                   // amounts
        [                                               // proofs
            [
                "0xead00ed97ed19a8b873582abd2a9a951302d7718fbc9cd481f102ffab9668789",
                "0x536f0d38fa261e0b852bc47b72338c5af5dc9904fa9ef6b491034abd07501d45",
                "0x2f5c204ae7d3daed5d08a1eec93012ff94836956414f7deb26ad7862eaac33a0",
                "0x89d3a0f3c0f7006c4df48dfb117f045299ba7155352fe20bf02396fccf3aef8f",
                "0xa80573ccdc6f54a3ff05f9f05fadb1b02fe3bb4867d6edab2dced9b00c2b03e1",
                "0x2a26aa6f67afef5b9e70a4ad412717fd503259b16ac787ea83a6eb925134d4af",
                "0xaa4c87b02d93d5f071cbdd1d1a2d49768425fc21aaf4173e609edc1ac8c4c208",
                "0xff8d5801ef451391f30af699ad1bab19652e9e74b7e5ecfa41d04d61d134be72",
                "0xa8c6d279cb2e991d20a3ae9ec47bd99606417a4a91977aa3d499d626087f991c",
                "0x39fd4c32a87e6c2764768b80184543df3a83e1ac8dd0bdfa656c3cbcf5702719",
                "0xf3672843aab63c3371c66977f25b83c5d8f8864294bcb7806e44f82943d9f2cb",
                "0xdc66288b4bac10d08613debb0e520293446e5a07152375a0122dc5093f36f4ba",
                "0xe7f597bff34e65c216712be1392b890da84b3c13bc4ef72b9024956ca26b26c9",
                "0xbec921621d2c94a680db07344cba33f2755cf3502395ba2fc8247dfea0eea372",
                "0x497ed320bbac7c4aca28246af59070fbb40280330bd1ae480a755476206077e0"
            ]
        ]
    , gas);

    let amountTo = await usdb.balanceOf(fenixSwap.address);
    console.log("DEBUG: amountTo =", amountTo.toString());

    await provider.send("hardhat_stopImpersonatingAccount", [unitAddress]);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });