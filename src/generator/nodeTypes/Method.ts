import * as ui5     from "../ui5api";
import Config, { StringMap }       from "../GeneratorConfig";
import TypeUtil     from "../util/TypeUtil";
import TreeNode     from "./base/TreeNode";
import Parameter    from "./Parameter";
import Types        from "./Type";
import Class, { ClassMaps } from "./Class"; // Only use by type

interface ReturnValue {
    types: Types;
    description: string;
}

export default class Method extends TreeNode {

    private visibility: ui5.Visibility;

    public readonly static: boolean;
    private readonly description: string;
    private readonly parameters: Parameter[];
    private readonly returnValue: ReturnValue;

    private readonly parentKind: ui5.Kind;
    private readonly parentName: string;

    private readonly deprecated?: ui5.DeprecatedInfo;

    private ignore = false;
    private needsCompatibility = false;

    constructor(config: Config, method: ui5.Method, parentName: string, indentationLevel: number, parentKind: ui5.Kind) {
        super(config, indentationLevel, method.name, parentName);

        if (method.static && this.getConfig(config.replacements.specific.methodRemoveStaticQualifier)) {
            method.static = false;
        }

        if (this.getConfig(config.replacements.specific.methodVisibilityPublic)) {
            this.visibility = ui5.Visibility.Public;
        }
        else {
            this.visibility = super.replaceVisibility(method.visibility);
        }
        
        this.static = method.static || false;
        this.description = method.description || "";
        this.parameters = (method.parameters || []).map(p => new Parameter(this.config, p, this.fullName));
        this.parentKind = parentKind;
        this.parentName = parentName;
        this.deprecated = method.deprecated;

        let returnTypeReplacement = this.getConfig(config.replacements.specific.methodReturnType);
        
        let description = (method.returnValue && method.returnValue.description) || "";
        let returnType = returnTypeReplacement || (method.returnValue && method.returnValue.type) || (description ? "any" : "void");
        returnType = TypeUtil.replaceTypes(returnType, config, this.fullName);

        if (Method.shouldReplaceReturnTypeWithThis(returnType, this.static, parentKind, parentName, this.fullName, this.name, config)) {
            returnType = "this";
        }

        this.returnValue = { types: new Types(returnType), description };
    }

    private getConfig(obj: StringMap): string | undefined;
    private getConfig(obj: Set<string>): boolean;
    private getConfig(obj: StringMap | Set<string>): any | undefined {
        if (obj instanceof Set) {
            return (obj.has(this.fullName) || obj.has(`*.${this.name}`));
        }
        else {
            return obj[this.fullName] || obj[`*.${this.name}`];
        }
    }

    public generateTypeScriptCode(output: string[]): void {
        if (this.shouldIgnore()) return;
        this.printMethodTsDoc(output, this.description, this.parameters, this.returnValue);
        this.printMethodOverloads(output, this.parameters || []);
        this.printCompatibilityMethodOverload(output, this.parameters);
    }

    private printCompatibilityMethodOverload(output: string[], originalParameters: Parameter[]): void {
        if (this.needsCompatibility || this.config.replacements.specific.methodOverridesNotCompatible.has(this.fullName)) {
            let symbol: ui5.Parameter = {
                name: "args",
                type: "any[]",
                spread: true
            };
            let compatibilityParameters = [new Parameter(this.config, symbol, this.fullName)];
            let returnValue = { types: new Types("any"), description: "" };

            let description = [
                `This method overload is here just for compatibility reasons to avoid compiler errors because`,
                ` UI5 API doesn't follow all TypeScript method overload rules.\n`,
                originalParameters.map(p => p.getTypeScriptCode()).join(", ")
            ].join("");
            
            this.printMethodTsDoc(output, description, compatibilityParameters, returnValue);
            this.print(output, compatibilityParameters, returnValue);
        }
    }

    /**
     * UI5 has methods where an optional parameter comes before a required one.
     * These should be written as overloads so it can be called with or without the optional.
     * For example: 
     *  attachPress(oData?, fnFunction!, oListener?)
     *  onChange(oEvent!, mParameters?, sNewValue!)
     * 
     * There are also some methods where an optional parameter has a type and a later optional parameter has a different type or any.
     * These should eb overloaded so the different parameter can be passed in place of the first.
     * For example:
     *  constructor(sId?: string, settings?: any)
     */
    private printMethodOverloads(output: string[], parameters: Parameter[]): void {
        if (parameters.length > 1) {
            let firstOptionalIndex = -1;
            for (let i = 1; i < parameters.length; i++) { // starts at index 1, and we'll look back to the previous
                let previousIndex = i - 1;
                let previous = parameters[previousIndex];
                let current = parameters[i];
                
                if (previous.isOptional()) {
                    if (firstOptionalIndex === -1) {
                        firstOptionalIndex = previousIndex;
                    }

                    if (current.isRequired()) {

                        let numberOfOptionals = i - firstOptionalIndex;

                        let beforeOptionals = parameters.filter((p, j) => (j < firstOptionalIndex));
                        let optionals = parameters.filter((p, j) => (j >= firstOptionalIndex && j < i));
                        let afterOptionals = parameters.filter((p, j) => (j >= i));

                        // Print it with all the parameters as required.
                        this.printMethodOverloads(output, [
                            ...beforeOptionals,
                            ...optionals.map(p => p.asRequired()),
                            ...afterOptionals
                        ]);
                        
                        // Print it with all the optionals removed
                        this.printMethodOverloads(output, [
                            ...beforeOptionals,
                            ...afterOptionals
                        ]);

                        if (numberOfOptionals === 1) {
                            // Nothing to do.
                            return;
                        }
                        else if (numberOfOptionals === 2) {
                            // Merge the optional params
                            this.printMethodOverloads(output, [
                                ...beforeOptionals,
                                Parameter.combine(this.config, optionals, false),
                                ...afterOptionals
                            ]);
                        }
                        else {
                            if (!this.needsCompatibility) {
                                // console.log(`Need to add compatibility for ${this.fullName}`);
                                this.needsCompatibility = true;
                            }
                        }
                        return; // don't print the default parameters since ts doesn't allow optional before required.
                    }
                    else if (i === (parameters.length - 1)) {
                        let numberOfPreviousOptionals = i - firstOptionalIndex;
                        let beforeOptionals = parameters.filter((p, j) => (j < firstOptionalIndex));
                        if (numberOfPreviousOptionals > 1) {
                            // console.log(`Adding compatibility to ${this.fullName}`);
                            // TODO see if the params are all compatible from right to left. i.e. method(a?: any[], b?: any[], c?: any)
                            this.needsCompatibility = true;
                        }
                        else if (!current.isCompatible(previous)) {
                            // i.e. constructor(sId?: string, aSettings?: any)
                            this.printMethodOverloads(output, [
                                ...beforeOptionals,
                                current,
                            ]);
                        }
                        // else 2 right-to-left shift compatible params. i.e. method(a?: any, b?: string)

                        // no return here. print the default too with all the trailing optional params.
                    }
                }
            }
        }
        this.print(output, parameters, this.returnValue);
    }

    private print(output: string[], parameters: Parameter[], returnValue: ReturnValue): void {
        let declaration: string;

        switch (this.parentKind) {
            case ui5.Kind.Namespace:
                declaration = "function ";
                break;
            case ui5.Kind.Interface:
                declaration = "";
                break;
            case ui5.Kind.Class:
                let visibilityModifier = this.visibility.replace(ui5.Visibility.Restricted, ui5.Visibility.Protected).replace(ui5.Visibility.Public, "");
                let staticModifier = this.static ? "static " : "";
                declaration = (visibilityModifier ? `${visibilityModifier} ` : "") + staticModifier;
                break;
            default:
                throw new Error(`UI5 kind '${this.parentKind}' cannot have methods.`);
        }

        let parametersCode = parameters.map(p => p.getTypeScriptCode());
        let returnTypeString = (this.name === "constructor") ? "" : `: ${returnValue.types.generateTypeScriptCode()}`;
        output.push(`${this.indentation}${declaration}${this.name}(${parametersCode.join(", ")})${returnTypeString};\r\n\r\n`);
    }

    private static shouldReplaceReturnTypeWithThis(returnType: string, isStatic: boolean, parentKind: ui5.Kind, parentName: string, fullName: string, name: string, config: Config) {
        return !isStatic &&
            name !== "constructor" &&
            parentKind === ui5.Kind.Class &&
            parentName === returnType &&
            !config.replacements.specific.methodReturnTypeNotThis.has(fullName);
    }

    /**
     * Called for checking if an override can be ignored.
     * @param other 
     */
    private isSameAsParent(parent: Method): boolean {
        if (this.name !== parent.name) return false;
        if (!this.returnValue.types.isEqual(parent.returnValue.types)) return false;
        if (this.parameters.length !== parent.parameters.length) return false;
        return this.parameters.every((thisParam, index) => {
            let parentParam = parent.parameters[index];
            return thisParam.isEquivalent(parentParam);
        });
    }

    private shouldIgnore(): boolean {
        if (this.ignore) {
            return true;
        }
        if (this.parentKind === ui5.Kind.Class) {
            if (this.static && this.config.ignore.ignoreStaticMethods.has(this.fullName)) {
                return true;
            }
        }
        if (this.config.ignore.ignoreMethods.has(this.fullName)) {
            return true;
        }
        return false;
    }

    private printMethodTsDoc(output: string[], description: string, parameters: Parameter[], returnValue: ReturnValue): void {
        let docInfo = parameters.map(p => p.getTsDoc().replace(/\r\n|\r|\n/g, " "));

        if (!returnValue.types.isVoid()) {
            docInfo.push(`@returns {${returnValue.types.generateTypeScriptCode()}} ${returnValue.description}`.replace(/\r\n|\r|\n/g, " "));
        }

        if (this.deprecated) {
            let deprecated = [ 
                "@deprecated",
                this.deprecated.since && `Since version ${this.deprecated.since}.`, 
                this.deprecated.text
            ].filter(t => t).join(" ");
            docInfo.push(deprecated);
        }

        super.printTsDoc(output, description, docInfo);
    }

    /**
     * Fix overrides in case the base class has a more specific type than the sub class.
     * This is called after tree generation but before printing starts.
     * TODO: see if the return type overrides are still needed now that we have the 'this' logic, since this causes some issues.
     *   We'll still need the visibility fixes.
     * @param classes
     */
    public static fixMethodsOverrides(classes: ClassMaps): void {
        for (let baseClassName of classes.byBaseClass.keys()) {
            let baseClass = classes.byName.get(baseClassName);
            if (baseClass && !baseClass.baseClass) {
                Method.fixMethodsOverridesByBaseClass(baseClassName, classes);
            }
        }
    }

    private static fixMethodsOverridesByBaseClass(baseClassName: string, classes: ClassMaps): void {
        const baseClass = classes.byName.get(baseClassName);
        const subClasses = classes.byBaseClass.get(baseClassName);
        if (baseClass && subClasses) {
            subClasses.forEach(subClass => Method.fixMethodsOverridesFor(baseClass, subClass, classes));
        }
    }

    // TODO move this to methods by inspecting its parents, and change the method props back to private
    private static fixMethodsOverridesFor(baseClass: Class, subClass: Class, classes: ClassMaps): void {
        subClass.methods.forEach(method => {
            const methodOverridden = Method.findMethodInBaseClassHierarchy(baseClass, method, classes);
            if (methodOverridden) {
                const returnTypeMethod = method.returnValue.types.generateTypeScriptCode();
                const returnTypeMethodOverridden = methodOverridden.returnValue.types.generateTypeScriptCode();

                let newReturnType: Types|undefined;
                if (!Method.checkReturnTypeCompatibility(returnTypeMethodOverridden, returnTypeMethod, classes)) {
                    // for "return this" methods
                    if (returnTypeMethodOverridden === baseClass.fullName) {
                        if (returnTypeMethod !== subClass.fullName) {
                            newReturnType = new Types(subClass.fullName); // "return this" in this case it's the subClass
                        }
                    }
                    // for "return somethingElse" methods
                    else {
                        newReturnType = methodOverridden.returnValue.types;
                    }
                }

                if (newReturnType && !newReturnType.isAny() && !method.returnValue.types.isThis()) {
                    // if (!returnTypeMethodOverridden.includes("Metadata")) { // this one is too noisy
                    //     console.log(`${method.fullName}: Replacing return type from '${method.returnValue.types}' to '${newReturnType}' to match the same method in base class '${baseClass.fullName}'.`);
                    // }
                    method.returnValue.types = newReturnType;
                }

                if (methodOverridden.visibility === ui5.Visibility.Public && method.visibility === ui5.Visibility.Protected) {
                    method.visibility = ui5.Visibility.Public;
                }

                if (!method.static) {
                    if (method.isSameAsParent(methodOverridden)) {
                        // console.log(`Flagging ${method.fullName} as ignored`);
                        method.ignore = true;
                        return;
                    }
                    // else {
                    //     console.log(`Override cannot be removed: ${method.fullName}`);
                    // }
                }
            }
        });

        Method.fixMethodsOverridesByBaseClass(subClass.fullName, classes);
    }

    private static findMethodInBaseClassHierarchy(baseClass: Class|undefined, method: Method, classes: ClassMaps): Method|undefined {
        if (!baseClass) return;
        const baseBaseClass = classes.byName.get(baseClass.baseClass);
        return baseClass.methods.find(baseMethod => (baseMethod.name === method.name && baseMethod.static === method.static)) || Method.findMethodInBaseClassHierarchy(baseBaseClass, method, classes);
    }

    // TODO do in TypeUtil?
    private static checkReturnTypeCompatibility(baseType: string, subType: string, classes: ClassMaps): boolean {
        if (baseType === subType || baseType === "void" || subType === "any" || subType === "this") {
            return true;
        }
        
        const baseClass = classes.byName.get(baseType);
        let subClass = classes.byName.get(subType);

        if (baseClass && subClass) {
            do {
                if (subClass.name === baseClass.name) {
                    return true;
                }
                subClass = classes.byName.get(subClass.baseClass);
            } while(subClass);
        }

        return false;
    }

}
