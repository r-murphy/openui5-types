import * as ui5     from "../../ui5api";
import Config       from "../../GeneratorConfig";
import TreeNode     from "./TreeNode";
import Namespace    from "../Namespace";
import Class        from "../Class";
import Method       from "../Method";
import Interface    from "../Interface";
import Enum         from "../Enum";
import Typedef      from "../Typedef";

export default class TreeBuilder {

    public static createFromSymbolsArray(config: Config, symbols: ui5.Symbol[]): TreeNode[]
    {
        symbols.sort((a, b) => a.name.localeCompare(b.name));
        let rootNodes = TreeBuilder.createNodeChildren(config, symbols, 0);
        let classMaps = Class.getClassMaps(rootNodes);
        Method.fixMethodsOverrides(classMaps);
        return rootNodes;
    }

    private static createNodeChildren(config: Config, symbols: ui5.Symbol[], indentationLevel: number): TreeNode[]
    {
        let nodes: TreeNode[] = [];
        let namespaces = new Set<string>();

        symbols
            .map(s => s.name.split(".").slice(0, indentationLevel + 1).join("."))
            .forEach(n => namespaces.add(n));

        for (var namespace of namespaces) {
            if (!config.ignore.ignoreNamespaces.has(namespace)) {
                let parentSymbol = symbols.find(s => s.name === namespace) || <ui5.SymbolNamespace>{
                    kind: ui5.Kind.Namespace
                    , visibility: ui5.Visibility.Public
                    , name: namespace
                    , basename: namespace.replace(/^.*[.]/, "")
                    , module: ""
                    , resource: ""
                };
                let childrenSymbols = symbols.filter(s => s.name.startsWith(namespace + "."));
                let children = TreeBuilder.createNodeChildren(config, childrenSymbols, indentationLevel + 1);
                let newNode = TreeBuilder.createNode(config, parentSymbol, children, indentationLevel);
                nodes.push(newNode);
            }
        }

        return nodes;
    }

    private static createNode(config: Config, symbol: ui5.Symbol, children: TreeNode[], indentationLevel: number): TreeNode {
        switch (symbol.kind) {
            case ui5.Kind.Namespace: return new Namespace   (config, symbol, children, indentationLevel);
            case ui5.Kind.Class:     return new Class       (config, symbol, children, indentationLevel);
            case ui5.Kind.Interface: return new Interface   (config, symbol, children, indentationLevel);
            case ui5.Kind.Enum:      return new Enum        (config, symbol, children, indentationLevel);
            case ui5.Kind.Typedef:   return new Typedef     (config, symbol, children, indentationLevel);
            default: throw new Error(`Unknown symbol kind: ${(<any>symbol).kind}`);
        }
    }
}
