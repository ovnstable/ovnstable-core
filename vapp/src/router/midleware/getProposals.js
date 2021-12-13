export default async function getOverview({ context, nextMiddleware }){
    try {
        console.log('getProposals')
        context.store.dispatch('web3/initWeb3').then(value => {
            context.store.dispatch('governance/getProposals');
            context.store.dispatch('ethers/initProvider');
        });
    }
    catch(e){
        console.error(e);
        return context.next(false);
    }
    return nextMiddleware()
};
