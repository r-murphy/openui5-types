import * as ui5 from "../ui5api";
import Config   from "../GeneratorConfig";
import TypeUtil from "../util/TypeUtil";

export default class Parameter {

    private constructorArgs: any[];

    private name: string;
    private type: string;
    // private types = new Set<string>();
    private optional: boolean;
    private spread: boolean;
    private description: string;

    constructor(config: Config, parameter: ui5.Parameter, parentName: string) {
        // save constructor arguments to reinstantiate if needed
        this.constructorArgs = [...arguments];

        let parameterFullName = `${parentName}.${parameter.name}`;
        let parentBaseName = parentName.split(".").pop() as string;

        let parameterTypeReplacement = this.getConfigValue(config.replacements.specific.methodParameterType, parameterFullName, parameter.name, parentBaseName);

        if (!parameter.optional && this.getConfigValue(config.replacements.specific.methodParameterOptional, parameterFullName, parameter.name, parentBaseName)) {
            parameter.optional = true;
        }

        this.name = parameter.name;
        this.type = TypeUtil.replaceTypes(parameterTypeReplacement || parameter.type, config, parameterFullName);
        this.optional = parameter.optional || false;
        this.spread = parameter.spread || false;
        this.description = parameter.description || "";
    }

    private getConfigValue(map: any, parameterFullName: string, parameterName: string, parentBaseName: string) {
        return map[parameterFullName] || map[`*.${parentBaseName}.${parameterName}`] || map[`*.${parameterName}`];
    }

    public getTypeScriptCode(): string {
        return `${this.spread ? "..." : ""}${this.name.replace(/<[^>]+>/g, "")}${this.optional ? "?" : ""}: ${this.type}`;
    }

    public getTsDoc(): string {
        let description = this.description ? ` - ${this.description}` : "";
        return `@param {${this.type}} ${this.name}${description}`;
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
        // hacky for now to handle constructor overloads.
        // TODO implement a proper compatible check with more types
        if (this.type === other.type) {
            return true;
        }
        if (other.hasAny()) {
            return true;
        }
        if (this.type.split("|").some(t => other.hasType(t.trim()))) {
            return true;
        }
        if (this.hasArray() && other.hasAnyArray()) {
            return true;
        }
        // if (other.hasType("object"))
        // if (other.type === "any[]" || this.type === "any[]") return true;
        // else if (this.type === "string" && other.type === "any") return false;
        // else if (this.type === "any")
        else return false;
    }

    private hasType(type: string): boolean {
        return this.type.split("|").some(t => t.trim() === type);
    }

    private hasAny() {
        return this.hasType("any");
    }

    private hasAnyArray() {
        return this.hasType("any[]") || this.hasType("Array<any>");
    }

    public addAny() {
        this.type += "|any";
    }

    private hasArray() {
        return /(\[\])|Array/.test(this.type);
    }

    // public isTypeEqual(other: Parameter): boolean {
    //     return (this.type === other.type);
    // }

}
