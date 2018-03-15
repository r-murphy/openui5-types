import * as UI5API from './ui5api';

export interface StringMap {
    [key: string]: string;
}

export default interface Config {
    local: {
        runLocal: boolean,
        path:     string,
    }

    output: {
        exportsPath:        string,
        definitionsPath:    string,
        indentation:        string,
    },

    input: {
        apiBaseUrl:     string,
        jsonLocation:   string,
        versions:       string[],
        namespaces:     string[],
    },

    ignore: {
        ignoreNamespaces:                       Set<string>,
        ignoreMethods:                          Set<string>,
        ignoreStaticMethods:                    Set<string>,
        ignoreStaticProperties:                 Set<string>,
        smartStaticMethodFixing:                Set<string>,
        smartStaticMethodFixingAllowedMethods:  Set<string>,
    },

    additions: {
        [library: string]: UI5API.Symbol[]
    },

    additionalExports: [{
        path: string;
        type: string;
    }],

    replacements: {
        global:                                 { [type: string]: string },
        // warnings:                            Set<string>
        specific:   {
            baseClass:                          { [className:   string]: string  },
            namespaceAsType:                    { [namespace:   string]: string  },
            propertyType:                       { [property:    string]: string  },
            // methods
            methodParameterType:                { [parameter:   string]: string  },
            methodReturnType:                   { [method:      string]: string  },
            methodParameterOptional:            Set<string>,
            methodVisibilityPublic:             Set<string>,
            methodOverridesNotCompatible:       Set<string>,
            methodReturnTypeNotThis:            Set<string>,
            methodRemoveStaticQualifier:        Set<string>,
        }
    },
}
