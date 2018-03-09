
import * as fs        from 'fs';
import * as JSON5     from 'json5';
import * as UI5API    from './ui5api';
import TreeBuilder    from './nodeTypes/base/TreeBuilder';
import Config         from './GeneratorConfig';
import { getApiJson } from './util/ApiFetcher';

const versionMarker = "{{VERSION}}";

export default class Generator
{
    private config: Config;

    public constructor(configPath: string) {
        let jsonConfig      = fs.readFileSync(configPath, { encoding: "utf-8" });
        this.config         = JSON5.parse(jsonConfig);
        Generator.setifyConfig(this.config.ignore);
        Generator.setifyConfig(this.config.replacements.specific);
    }

    private static setifyConfig(config: {[key: string]: any}) {
        for (let key of Object.keys(config)) {
            let val = config[key];
            if (Array.isArray(val)) {
                config[key] = new Set(val);
            }
            else if (typeof val === "object") {
                Generator.setifyConfig(val);
            }
        }
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
        version = version.split(".").slice(0, -1).join("."); // major.minor
        this.applyAdditions(apiList);
        this.createExports(apiList, version);
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
        let baseDefinitionsPath = this.config.output.definitionsPath.replace(versionMarker, version);
        let indexContent: string[] = [];
        for (let node of rootNodes) {
            let output: string[] = [];
            node.generateTypeScriptCode(output);
            let filename = `${node.fullName}.d.ts`;
            this.createFile(`${baseDefinitionsPath}/${filename}`, output.join(""));
            indexContent.push(`/// <reference path="./${filename}" />`)
        }

        this.createFile(`${baseDefinitionsPath}/index.d.ts`, indexContent.join("\n"));
    }

    private createExports(apiList: UI5API.API[], version : string): void
    {
        apiList.forEach(api => api.symbols.forEach(s => this.exportSymbol(s, version)));
    }
    
    private exportSymbol(symbol: UI5API.Symbol, version: string): void
    {
        if (symbol.name.match(/^jquery/i))
        {
            return;
        }
        let basePath = this.config.output.exportsPath.replace(versionMarker, version);
    
        if (symbol.kind == "namespace" && symbol.name.replace(/[.]/g, "/") === symbol.module)
        {
            let path = basePath + symbol.resource.replace(/[.]js$/g, ".d.ts");
            let content = `export default ${symbol.name};`
    
            this.createFile(path, content);
        }
        else if (symbol.kind === "class")
        {
            let path = basePath + symbol.name.replace(/[.]/g, "/") + ".d.ts";
            let content = `export default ${symbol.name};`
    
            this.createFile(path, content);
        }
        else if (symbol.kind === "enum")
        {
            let path = basePath + symbol.name.replace(/[.]/g, "/") + ".d.ts";
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
