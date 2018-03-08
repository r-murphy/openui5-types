
import * as fs        from 'fs';
import * as Path      from 'path';
import * as JSON5     from 'json5';
import * as UI5API    from './ui5api';
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
    
    private generateFromDesignTimeApi(apiList: UI5API.API[], version: string): void
    {
        this.applyAdditions(apiList);
        this.createExports(apiList);
        this.createDefinitions(apiList, version);
    }

    private applyAdditions(apiList: UI5API.API[])
    {
        for (let api of apiList) {
            let additions = this.config.additions[api.library];
            if (additions) {
                api.symbols.push(...additions);
            }
        }
    }

    private createDefinitions(apiList: UI5API.API[], version: string): void
    {
        let allSymbols = apiList.map(api => api.symbols).reduce((a, b) => a.concat(b));

        let rootNodes = TreeBuilder.createFromSymbolsArray(this.config, allSymbols);
        for (let node of rootNodes) {
            let output: string[] = [];
            let tsCode = node.generateTypeScriptCode(output);
            this.createFile(`${this.config.output.definitionsPath}${version.replace(/[.]\d+$/, "")}/${node.fullName}.d.ts`, output.join(""));
        }

        // Uncomment this to see the details, statistics and example values of the different types of API members
        // this.printApiData(allSymbols);
    }

    private createExports(apiList: UI5API.API[]): void
    {
        apiList.forEach(api => api.symbols.forEach(s => this.exportSymbol(s)));
    }
    
    private exportSymbol(symbol: UI5API.Symbol): void
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
