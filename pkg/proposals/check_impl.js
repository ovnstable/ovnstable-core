const hre = require("hardhat");

async function main() {
    const code = await hre.ethers.provider.getCode("0xc991047d9bd4513274b74DBe82b94cc22252CB30");
    console.log("Bytecode length:", code.length);
    console.log("Contract exists:", code !== "0x");
    
    // Попробуем вызвать unstakeFull selector
    const selector = "0x83868e33"; // unstakeFull()
    console.log("unstakeFull selector:", selector);
}

main().catch(console.error);
