import * as UI5API from './ui5api';

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
    ignore: string[],
    ignoreStatic: string[], // static methods to ignore (if they don't actually exist)
    
    replacements: {
        global:     { [type: string]: string },
        warnings:    string[],
        specific:   {
            namespaceAsType:                { [namespace:   string]: string  },
            propertyType:                   { [property:    string]: string  },
            filterMethods:                  { [method:      string]: boolean },
            // methods
            methodParameterType:            { [parameter:   string]: string  },
            methodReturnType:               { [method:      string]: string  },
            methodParameterOptional:        { [method:      string]: boolean },
            methodVisibilityPublic:         { [method:      string]: boolean },
            methodOverridesNotCompatible:   string[],
            methodReturnTypeNotThis:        string[],
            methodRemoveStatic:             string[],
        }
    },

    additions: {
        [library: string]: UI5API.Symbol[]
    }
}
