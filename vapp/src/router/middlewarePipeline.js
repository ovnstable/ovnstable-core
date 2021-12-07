function middlewarePipeline (context, middleware, index) {
    let nextMiddleware = middleware[index];
    if(!nextMiddleware){
        // debugger;
        return context.next;
    }
    return () => {
        const nextPipeline = middlewarePipeline(context, middleware, index + 1);

        nextMiddleware({ context, nextMiddleware: nextPipeline });
    }
};
export default middlewarePipeline;