function define(aDependencies: string[], vFactory: (...args: any[]) => any): any
{
    //remove the dependencies "require" and "exports" generated by typescript compiler
    var newDependencies = aDependencies.slice(2);

    //pass null instead of the dependencies "require" and "exports" and wraps the ui5 dependencies in a default property of a new object
    var newFactory = (...args: any[]) => {
        var exports: { default: any } = { default: undefined };
        vFactory(null, exports, ...args.map((d: any) => ({ default: d })));
        return exports.default;
    };

    return sap.ui.define(newDependencies, newFactory);
}
