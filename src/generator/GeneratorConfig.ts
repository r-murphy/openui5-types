import { UI5Symbol, Property as UI5Property } from "./ui5api";

export interface StringMap {
    [key: string]: string;
}

export default interface Config {
    local: {
        runLocal: boolean,
        path: string,
    };

    output: {
        exportsPath: string,
        definitionsPath: string,
        indentation: string,
    };

    input: {
        apiBaseUrl: string,
        jsonLocation: string,
        versions: string[],
        namespaces: string[],
    };

    references: {
        [lib: string]: string[];
    };

    ignore: {
        ignoreNamespaces: Set<string>,
        ignoreMethods: Set<string>,
        ignoreStaticMethods: Set<string>,
        ignoreSymbolKinds: Set<string>,
        ignoreStaticProperties: Set<string>,
        smartStaticMethodFixing: Set<string>,
        smartStaticMethodFixingAllowedMethods: Set<string>,
    };

    additions: {
        [library: string]: UI5Symbol[],
    };

    additionalExports: [{
        path: string;
        type: string;
    }];

    additionalProperties: {
        [parent: string]: UI5Property[];
    };

    replacements: {
        global: { [type: string]: string },
        // warnings:                            Set<string>
        specific: {
            baseClass: { [className: string]: string  },
            namespaceAsType: { [namespace: string]: string  },
            propertyType: { [property: string]: string  },
            // methods
            methodParameterType: { [parameter: string]: string  },
            methodReturnType: { [method: string]: string  },
            methodParameterOptional: Set<string>,
            methodVisibilityPublic: Set<string>,
            methodOverridesNotCompatible: Set<string>,
            methodReturnTypeNotThis: Set<string>,
            methodRemoveStaticQualifier: Set<string>,
        },
    };
}
