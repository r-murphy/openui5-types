
import * as fs        from 'fs';
import * as Path      from 'path';
import * as JSON5     from 'json5';
import * as ui5       from './ui5api';
import TreeNode       from './nodeTypes/base/TreeNode';
import TreeBuilder    from './nodeTypes/base/TreeBuilder';
import Config         from './GeneratorConfig';
import { getApiJson } from './util/ApiFetcher';

export default class Generator
{
    private config: Config;

    public constructor(configPath: string) {
        let jsonConfig      = fs.readFileSync(configPath, { encoding: "utf-8" });
        this.config         = JSON5.parse(jsonConfig);
    }

    public async generate(): Promise<void>
    {
        let versions = this.config.input.versions;
        for (let version of versions) {
            await this.generateVersion(version);
        }
    }

    private async generateVersion(version: string): Promise<void>
    {
        console.log(`Starting generation of version ${version}...`);
        try {
            let requestsPromises = this.config.input.namespaces.map(namespace => getApiJson(this.config, namespace, version));
            console.log(`All requests made.`);
            const apiList = await Promise.all(requestsPromises);
            this.generateFromDesignTimeApi(apiList, version);
            console.log(`Generation of version ${version} complete.`);
        }
        catch (error) {
            console.log("\x1b[31m", `\n\n  Error generating ${version}: ${error}\n\n`);
            if (error.stack) {
                console.error(error.stack);
            }
            process.exit(1);
        }
    }
    
    private generateFromDesignTimeApi(apiList: ui5.API[], version: string): void
    {
        this.createExports(apiList);
        this.createDefinitions(apiList, version);
    }

    private createDefinitions(apiList: ui5.API[], version: string): void
    {
        let allSymbols = apiList.map(api => api.symbols).reduce((a, b) => a.concat(b));

        // allSymbols.forEach(s => {
        //     console.log(s.name, "~~", s.kind);
        // })

        let rootNodes = TreeBuilder.createFromSymbolsArray(this.config, allSymbols);
        for (let node of rootNodes) {
            let output: string[] = [];
            let tsCode = node.generateTypeScriptCode(output);
            this.createFile(`${this.config.output.definitionsPath}${version.replace(/[.]\d+$/, "")}/${node.fullName}.d.ts`, output.join(""));
        }

        // Uncomment this to see the details, statistics and example values of the different types of API members
        // this.printApiData(allSymbols);
    }

    /**
     * This method just print api data to help identify and understand de API structure and define it in ui5api.ts
     * @param symbols Symbols array
     */
    // private printApiData(symbols: ui5.Symbol[]): void
    // {
    //     let result: { [name: string]: any } = {};
    //     let object: { [name: string]: any[] } = {};

    //     symbols.forEach(s => (object[s.kind] = object[s.kind] || []).push(s));

    //     this.addToResult(result, object);

    //     fs.writeFileSync("build/results.json", JSON.stringify(result, undefined, 2));
    //     // console.log(result);
    // }

    // private addToResult(result: { [name: string]: any }, object: any): void
    // {
    //     let storageValuesFrom = [
    //         "kind",
    //         "visibility",
    //         "static",
    //         "final",
    //         "abstract",
    //         "optional",
    //         "defaultValue",
    //         "$keyEqualsName"
    //     ];

    //     let treatAsArray = [
    //         "parameterProperties"
    //     ];

    //     if (Array.isArray(object)) {
    //         if (object.length > 0 && typeof(object[0]) === "object") {
    //             result.$length = (result.$length || 0) + object.length;
    //             object.forEach(o => this.addToResult(result, o));
    //         }
    //         else {
    //             result.$examples = result.$examples || [];
    //             if (result.$examples.length < 5) result.$examples.push(object);
    //         }
    //     }
    //     else {
    //         if (object && object.hasOwnProperty("defaultValue")) {
    //             object.defaultValue = typeof(object.defaultValue) + "[" + object.defaultValue + "]";
    //         }
    //         for (let key in object) {
    //             if (object.hasOwnProperty(key)) {
    //                 let value = object[key];
    //                 key = key === "constructor" ? "_constructor" : key;

    //                 result[key] = result[key] || { $count: 0 };
    //                 result[key].$count++;

    //                 if (typeof(value) === "object") {
    //                     if (treatAsArray.indexOf(key) > -1) {
    //                         let array: any[] = [];
    //                         for (let k in value) {
    //                             value[k].$keyEqualsName = k === value[k].name;
    //                             array.push(value[k]);
    //                         }
    //                         value = array;
    //                     }
    //                     this.addToResult(result[key], value);
    //                 }
    //                 else {

    //                     if (storageValuesFrom.indexOf(key) > -1) {
    //                         result[key][value] = result[key][value] || 0;
    //                         result[key][value]++;
    //                     }
    //                     else {
    //                         result[key].$examples = result[key].$examples || [];
    //                         if (result[key].$examples.length < 5 && result[key].$examples.indexOf(value) === -1) {
    //                             result[key].$examples.push(value);
    //                         }
    //                     }
    //                 }
    //             }
    //         }
    //     }
    // }

    private createExports(apiList: ui5.API[]): void
    {
        apiList.forEach(api => api.symbols.forEach(s => this.exportSymbol(s)));
    }
    
    private exportSymbol(symbol: ui5.Symbol): void
    {
        if (symbol.name.match(/^jquery/i))
        {
            return;
        }
    
        if (symbol.kind == "namespace" && symbol.name.replace(/[.]/g, "/") === symbol.module)
        {
            let path = this.config.output.exportsPath + symbol.resource.replace(/[.]js$/g, ".d.ts");
            let content = `export default ${symbol.name};`
    
            this.createFile(path, content);
        }
        else if (symbol.kind === "class")
        {
            let path = this.config.output.exportsPath + symbol.name.replace(/[.]/g, "/") + ".d.ts";
            let content = `export default ${symbol.name};`
    
            this.createFile(path, content);
        }
        else if (symbol.kind === "enum")
        {
            let path = this.config.output.exportsPath + symbol.name.replace(/[.]/g, "/") + ".d.ts";
            let content = `export default ${symbol.name};`
            
            this.createFile(path, content);
        }
    }
    
    private createFile(path: string, content: string): void
    {
        let dirPieces = path.replace(/\/[^/]+$/, "").split("/");
    
        // make sure that the directory exists
        for (let i = 0, dir = dirPieces[0]; i < dirPieces.length; i++, dir += `/${dirPieces[i]}`)
        {
            if (!fs.existsSync(dir))
            {
                fs.mkdirSync(dir);
            }
        }
    
        // write the file
        fs.writeFile(path, content, (err) => {
            if(err) {
                return console.log(err);
            }
        
            //console.log(`File saved: ${path}`);
        });
    }
}
