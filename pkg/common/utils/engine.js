const {
    getChainId
} = require('./script-utils');

const axios = require('axios');
const https = require('https');

// unsignedTransaction - https://docs.ethers.org/v5/api/utils/transactions/#UnsignedTransaction
async function engineSendTxSigned(unsignedTransaction, walletAddress = process.env.ENGINE_BACKEND_WALLET, txOverrides = undefined) {

    const engineUrl = process.env['ENGINE_URL'];
    const authorizationToken = process.env['ENGINE_ACCESS_TOKEN'];

    if (!engineUrl || !authorizationToken) {
        throw new Error("Engine env parameters missing: ENGINE_URL or ENGINE_ACCESS_TOKEN");
    }

    try {
        const agent = new https.Agent({
             rejectUnauthorized: false
        });  
        const chainId = await getChainId();
        const response = await axios.post(
            `${engineUrl}/backend-wallet/${chainId}/send-transaction?simulateTx=false`,
            { 
                toAddress: unsignedTransaction.to,
                data: unsignedTransaction.data,
                value: unsignedTransaction.value || 0,
                txOverrides
            }, 
            {
                httpsAgent: agent,
                headers: {
                    accept: "application/json",
                    "x-backend-wallet-address": walletAddress,
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authorizationToken}`,
                    "ngrok-skip-browser-warning": "true",
                },
            }
        );

        if (response.status !== 200) {
            throw new Error(`status code ${response.status}`);      
        }

        const queueId = response.data?.result?.queueId;
        if (!queueId) {
            throw new Error("no queue returned");
        }
        console.log(`tx submitted. queueId: ${queueId}. Waiting...`);

        const startTime = Date.now();
        while (true) {
            if (Date.now() - startTime > 2*60*1000) {
                throw new Error('tx timed out');
            }
            const status = await engineGetTxStatus(queueId);
            if (status.status === "mined") {
                const minedTime = Math.ceil((Date.now() - startTime)/1000);

                if (status.onchainStatus !== "success") {
                    console.error(`tx ${queueId} mined in ${minedTime} sec but failed: ${JSON.stringify(status)}`);
                    throw new Error("mined with error");
                }

                console.log(`tx ${queueId} mined in ${minedTime} sec`);
                return;
            }

            if (status.status === "errored") {
                console.error(`tx ${queueId}: ${status.errorMessage}: ${JSON.stringify(status)}`);
                throw new Error('tx errored');
            }

            await new Promise(resolve => setTimeout(resolve, 50)); 
        }
      } catch (error) {
        console.error("send-transaction error:", error);
        throw error;
      }
}

async function engineGetTxStatus(queueId) {
    const engineUrl = process.env['ENGINE_URL'];

    if (!engineUrl) {
        throw new Error("Engine env parameters missing: ENGINE_URL");
    }

    try
    {
        const agent = new https.Agent({
            rejectUnauthorized: false
        });  

        const response = await axios.get(
            `${engineUrl}/transaction/status/${queueId}`,
            {
                headers: {
                    accept: "application/json",
                    "Content-Type": "application/json",
                    "ngrok-skip-browser-warning": "true"
                },
                httpsAgent: agent
            }
        );
        if (response.status !== 200) {
            throw new Error(`status code ${response.status}`);      
        }

        const res = response.data.result;
        if (res) {
            return res;
        }
        throw new Error("no result field in data");
    } catch (err) {
        console.error(`can't get tx ${queueId} status: `, err);
    }
}


module.exports = {
    engineSendTxSigned: engineSendTxSigned
};
