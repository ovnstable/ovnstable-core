const { ARBITRUM } = require('@overnight-contracts/common/utils/assets');
const { transferAsset } = require('@overnight-contracts/common/utils/script-utils');

async function main() {
    await transferAsset(ARBITRUM.usdPlus, '0x764424B7Dc62c4cB57898Ee47DcDeEe8CCC5D5b8');
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
