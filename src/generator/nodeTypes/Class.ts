import * as ui5 from "../ui5api";
import Config   from "../GeneratorConfig";
import TypeUtil from "../util/TypeUtil";
import TreeNode from "./base/TreeNode";
import Property from "./Property";
import Method   from "./Method";

export interface ClassMaps {
    byName: Map<string, Class>;
    byBaseClass: Map<string, Class[]>;
}

export default class Class extends TreeNode {
    private readonly description: string;
    public readonly baseClass: string;
    public readonly methods: Method[];
    private readonly properties: Property[];
    private readonly children: TreeNode[];

    constructor(config: Config, apiSymbol: ui5.SymbolClass, children: TreeNode[], indentationLevel: number) {
        super(config, indentationLevel, apiSymbol);

        this.children = children;

        this.description = apiSymbol.description || "";
        this.baseClass = apiSymbol.extends ? TypeUtil.replaceTypes(apiSymbol.extends, config, this.fullName)  : "";
        this.properties = (apiSymbol.properties || []).map(m => new Property(this.config, m, this.fullName, indentationLevel + 1, ui5.Kind.Class));
        this.methods    = (apiSymbol.methods    || []).map(m => new Method  (this.config, m, this.fullName, indentationLevel + 1, ui5.Kind.Class));

        if (typeof(apiSymbol.constructor) === "object") {
            let constructorSymbol = Object.assign(apiSymbol.constructor, { name: "constructor" });
            let constructor = new Method(this.config, constructorSymbol, this.fullName, indentationLevel + 1, ui5.Kind.Class)
            this.methods = [constructor].concat(this.methods);
        }
    }

    public generateTypeScriptCode(output: string[]): void {
        if (this.isJQueryNamespace) {
            this.generateTypeScriptCodeJQuery(output);
        }
        else {
            this.generateTypeScriptCodeSap(output);
        }
    }

    private generateTypeScriptCodeSap(output: string[]): void {
        let extend = this.baseClass ? ` extends ${this.baseClass}` : "";

        this.printTsDoc(output, this.description);
        output.push(`${this.indentation}export class ${this.name}${extend} {\r\n`);
        this.properties.forEach(p => p.generateTypeScriptCode(output));
        this.methods.forEach(m => m.generateTypeScriptCode(output));
        output.push(`${this.indentation}}\r\n`);

        this.sortChildren();

        if (this.children.length) {
            output.push(`${this.indentation}namespace ${this.name} {\r\n`);
            this.children.forEach(c => c.generateTypeScriptCode(output));
            output.push(`${this.indentation}}\r\n`);
        }
    }

    private sortChildren() {

        const compareTypes = (c1: TreeNode, c2: TreeNode) => {
            if (c1 instanceof Property && c2 instanceof Property) return 0;
            if (c1 instanceof Property) return -1; // Props first
            if (c2 instanceof Property) return 1; // Props first
            return 0;
        };
        const compareStatics = (c1: any, c2: any) => {
            if (c1.static && c2.static) return 0;
            if (c1.static) return -1; // static first
            if (c2.static) return -1; // static first
            return 0;
        };
        const compareVisibility = (c1: any, c2: any) => {
            if (c1.visibility === c2.visibility) return 0;
            if (c1.visibility === ui5.Visibility.Public) return -1;
            if (c2.visibility === ui5.Visibility.Public) return 1;
            if (c1.visibility === ui5.Visibility.Protected) return -1;
            if (c2.visibility === ui5.Visibility.Protected) return 1;
            return 0;
        };
        const compareNames = (c1: TreeNode, c2: TreeNode) => {
            if (c1.name === "constructor") return -1;
            if (c2.name === "constructor") return 1;
            else return c1.name.localeCompare(c2.name);
        }

        this.children.sort((c1, c2) => {
            for (let fn of [compareTypes, compareStatics, compareVisibility, compareNames]) {
                let value = fn(c1, c2);
                if (value !== 0) {
                    return value;
                }
            }
            return 0;
        });
    }
    
    private generateTypeScriptCodeJQuery(output: string[]): void {
        var jQueryFullName = this.getJQueryFullName();
        let extend = this.baseClass ? ` extends ${this.baseClass}` : "";

        this.printTsDoc(output, this.description);
        output.push(`${this.indentation}declare class ${jQueryFullName}${extend} {\r\n`);
        this.properties.forEach(p => p.generateTypeScriptCode(output));
        this.methods.forEach(m => m.generateTypeScriptCode(output));
        //TODO: support class children (there is only one case, it's an enum. Could be converted in a static object literal)
        //this.children.forEach(c => c.generateTypeScriptCode(output));
        output.push(`${this.indentation}}\r\n`);
    }

    public static getClassMaps(nodes: TreeNode[]): ClassMaps {
        let classMaps: ClassMaps = {
            byName: new Map(),
            byBaseClass: new Map()
        };
        Class.fillClassMaps(nodes, classMaps);
        return classMaps;
    }

    private static fillClassMaps(nodes: TreeNode[], classMaps: ClassMaps): any {
        for (const node of nodes) {
            if (node instanceof Class) {
                if (classMaps.byName.has(node.fullName)) {
                    throw new Error(`Class '${node.fullName}' is already in the map.`);
                }
                classMaps.byName.set(node.fullName, node);

                if (node.baseClass && node.baseClass.match(/\./)) {
                    const arr = classMaps.byBaseClass.get(node.baseClass) || [];
                    arr.push(node);
                    classMaps.byBaseClass.set(node.baseClass, arr);
                }
            }
            
            const children = (<any>node).children;
            if (children) {
                this.fillClassMaps(children, classMaps);
            }
        }
    }

    public compare(other: Class) {
        if (this.fullName === other.baseClass) {
            return -1; // this first
        }
        else if (this.baseClass === other.fullName) {
            return 1; // other first
        }
        else {
            return this.fullName.localeCompare(other.fullName);
        }
    }

}
