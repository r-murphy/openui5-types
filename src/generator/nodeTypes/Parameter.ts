
import * as ui5 from "../ui5api";
import Config, { StringMap }   from "../GeneratorConfig";
import TypeUtil from "../util/TypeUtil";
import Types    from "./Type";

export default class Parameter {

    private constructorArgs: any[];

    private name: string;
    private readonly types: Types;
    private optional: boolean;
    private readonly spread: boolean;
    private readonly description: string;

    private readonly parentName: string;

    constructor(config: Config, parameter: ui5.Parameter, parentName: string) {
        // save constructor arguments to reinstantiate if needed
        this.constructorArgs = [...arguments];

        let parameterFullName = `${parentName}.${parameter.name}`;
        let parentBaseName = parentName.split(".").pop() as string;

        let parameterTypeReplacement = this.getConfig(config.replacements.specific.methodParameterType, parameterFullName, parameter.name, parentBaseName);

        if (!parameter.optional && this.getConfig(config.replacements.specific.methodParameterOptional, parameterFullName, parameter.name, parentBaseName)) {
            parameter.optional = true;
        }

        this.name = parameter.name;
        this.types = new Types(TypeUtil.replaceTypes(parameterTypeReplacement || parameter.type, config, parameterFullName));
        this.optional = parameter.optional || false;
        this.spread = parameter.spread || false;
        this.description = parameter.description || "";
        this.parentName = parentName;
    }

    private getConfig(obj: StringMap, parameterFullName: string, parameterName: string, parentBaseName: string): string | undefined;
    private getConfig(obj: Set<string>, parameterFullName: string, parameterName: string, parentBaseName: string) : boolean;
    private getConfig(obj: StringMap | Set<string>, parameterFullName: string, parameterName: string, parentBaseName: string): any | undefined {
        if (obj instanceof Set) {
            return obj.has(parameterFullName) || obj.has(`*.${parentBaseName}.${parameterName}`) || obj.has(`*.${parameterName}`);
        }
        else {
            return obj[parameterFullName] || obj[`*.${parentBaseName}.${parameterName}`] || obj[`*.${parameterName}`];
        }
    }

    public getTypeScriptCode(): string {
        return `${this.spread ? "..." : ""}${this.name.replace(/<[^>]+>/g, "")}${this.optional ? "?" : ""}: ${this.types.generateTypeScriptCode()}`;
    }

    public getTsDoc(): string {
        let description = this.description ? ` - ${this.description}` : "";
        return `@param {${this.types.generateTypeScriptCode()}} ${this.name}${description}`;
    }

    public isOptional(): boolean {
        return this.optional;
    }

    public isRequired(): boolean {
        return !this.optional;
    }

    public asRequired(): Parameter {
        if (!this.optional) {
            throw new Error("This parameter is already required");
        }

        var parameterConstructor: { new(...args: any[]): Parameter } = Parameter;
        var parameterAsRequired = new parameterConstructor(...this.constructorArgs);
        parameterAsRequired.optional = false;
        return parameterAsRequired;
    }

    public isCompatible(other: Parameter): boolean {
        return this.types.isCompatibleForParameter(other.types);
    }

    public addAny() {
        this.types.addAny();
    }

    isEquivalent(other: Parameter): boolean {
        if (!this.types.isEqual(other.types)) return false;
        if (this.optional !== other.optional) return false;
        // if (this.name.toLowerCase() !== other.name.toLowerCase()) {
        //     console.log(`Paramter ${this.parentName}.${this.name} was equivalent except in name to ${other.parentName}.${other.name}`);
        //     return false;
        // }
        return true;
    }

    static combine(config: Config, parameters: Parameter[], optional?: boolean): Parameter {
        let description = ""
        return new Parameter(config, {
            name: parameters.map(p => p.name).join("_or_"),
            type: parameters.map(p => p.types.generateTypeScriptCode()).join("|"),
            optional,
        }, parameters[0].parentName);
    }

}
