import * as ui5     from "../ui5api";
import Config       from "../GeneratorConfig";
import TreeNode     from "./base/TreeNode";
import EnumProperty from "./EnumProperty";

export default class Enum extends TreeNode {

    public name: string;
    public fullName: string;
    private description: string;
    private properties: EnumProperty[];

    constructor(config: Config, apiSymbol: ui5.SymbolEnum, children: TreeNode[], indentationLevel: number) {
        super(config, indentationLevel);

        if (children.length) {
            throw new Error("Enum cannot have children.");
        }

        this.name = apiSymbol.basename;
        this.fullName = apiSymbol.name;
        this.description = apiSymbol.description || "";
        this.properties = (apiSymbol.properties || []).map(p => new EnumProperty(this.config, p, this.fullName, indentationLevel + 1));
    }

    public generateTypeScriptCode(output: string[]): void {
        this.printTsDoc(output, this.description);
        output.push(`${this.indentation}export enum ${this.name.replace(/^.*[.]/, "")} {\r\n`);
        this.properties.forEach(p => p.generateTypeScriptCode(output));
        output.push(`${this.indentation}}\r\n`);
    }
}
