const {getContract} = require("@overnight-contracts/common/utils/script-utils");

const axios = require('axios');

async function main() {

    let pm = await getContract('PortfolioManager', process.env.STAND);

    let weights = await pm.getAllStrategyWeights();

    let items = [];


    let stand = process.env.STAND;

    let strategiesMapping;
    switch (stand){
        case 'polygon':
            strategiesMapping = (await axios('https://app.overnight.fi/api/dict/strategies')).data;
            break
        case 'polygon_dev':
            strategiesMapping = (await axios('https://dev.overnight.fi/api/dict/strategies')).data;
            break
    }


    for (let i = 0; i < strategiesMapping.length; i++) {

        let strategy = strategiesMapping[i];

        let weight = weights.find(value => strategy.address.toLowerCase() === value.strategy.toLowerCase());

        let item = {};
        item.strategy = strategy.address;
        item.name = strategy.name;

        if (weight && weight.targetWeight.toNumber() !== 0){
            item.minWeight = weight.minWeight / 1000;
            item.targetWeight = weight.targetWeight / 1000;
            item.maxWeight = weight.maxWeight / 1000;
            item.enabled = weight.enabled;
            item.enabledReward = weight.enabledReward;

            items.push(item);
        }

    }

    console.log(JSON.stringify(items));

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

