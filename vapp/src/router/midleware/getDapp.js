export default async function getDapp({ context, nextMiddleware }){
    try {
        context.store.dispatch('web3/initWeb3');
    }
    catch(e){
        console.error(e);
        return context.next(false);
    }
    return nextMiddleware()
};
