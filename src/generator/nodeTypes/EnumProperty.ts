import * as ui5 from "../ui5api";
import Config   from "../GeneratorConfig";
import TreeNode from "./base/TreeNode";

export default class EnumProperty extends TreeNode {

    public name: string;
    public fullName: string;
    private description: string;

    constructor(config: Config, apiSymbol: ui5.Property, parentName: string, indentationLevel: number) {
        super(config, indentationLevel);

        this.name = apiSymbol.name;
        this.fullName = `${parentName}.${this.name}`;
        this.description = apiSymbol.description || "";
    }

    public generateTypeScriptCode(output: string[]): void {
        this.printTsDoc(output, this.description);
        output.push(`${this.indentation}${this.name} = "${this.name}",\r\n`);
    }

}
