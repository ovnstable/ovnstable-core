export default async function getOverview({ context, nextMiddleware }){
    try {
        console.log('getOverview')
        context.store.dispatch('web3/initWeb3').then(value => {
            context.store.dispatch('governance/getOverview');
        });
    }
    catch(e){
        console.error(e);
        return context.next(false);
    }
    return nextMiddleware()
};
