import Config from "../GeneratorConfig";

export default {
    getJQueryFullName,
    replaceTypes,
    splitTypeString,
};

function replaceTypes(type: string, config: Config, name: string): string {
    let types = splitTypeString(type);

    types.forEach((t, i) => {
        let isArray = !!t.match(/.*\[\]$/);
        t = t.replace(/\[\]$/, "");

        let replacement = config.replacements.global[t];

        // warnings when using types that could be more specific
        // if (replacement && config.replacements.warnings.indexOf(replacement) > -1) {
            // console.log(`Replacing '${t}'${t !== type ? ` (in '${type}')` : ""} with '${replacement}' in '${name}'.`);
        // }

        t = replacement || t;

        if (t.match(/^jQuery[.]/)) {
            if (name.match(/^jQuery[.]/)) {
                t = getJQueryFullName(t);
            } else {
                t = `typeof ${t}`;
            }
        }

        types[i] = t + (isArray ? "[]" : "");
    });

    return types.join("|");
}

function getJQueryFullName(fullName: string): string {
    return fullName === "jQuery"
        ? "JQueryStatic"
        : fullName
            .split(".")
            .map((p) => p[0].toUpperCase() + p.slice(1))
            .join("");
}

/**
 * The naive approach to parse a type string is to split by '|'.
 * But in some case the '|' char is inside generics, so we'll account for that as well.
 * And in worst case, we can have nested generics.
 * "any | any[] | Promise<one> | Promise<Array<one|two>> | Array<one> | Array<one|two>"
 * @param str
 */
function splitTypeString(str: string): string[] {
    if (!str.includes("<")) {
        return str.split("|").map((s) => s.trim());
    }

    let types: string[] = [];
    let nextPosition = 0;
    let lastSplitter = 0;
    let genericDepth = 0;

    while (true) {
        let {token, index } = nextIndexOfToken(str, nextPosition);
        if (index === -1) {
            types.push(str.substring(lastSplitter));
            break;
        } else if (token === "<") {
            genericDepth++;
        } else if (token === ">") {
            genericDepth--;
        } else if (genericDepth === 0) {
            types.push(str.substring(lastSplitter, index));
            lastSplitter = index + 1;
        }
        nextPosition = index + 1;
    }
    return types.map((t) => t.trim());
}

//  | Promise<one> | Promise<Array<one|two>> | Array<one> | Array<one|two>

function nextIndexOfToken(str: string, position: number, tokens = ["|", "<", ">"]) {
    let theToken = "";
    let theIndex = -1;
    tokens.forEach((t, i) => {
        let newIndex = str.indexOf(t, position);
        if (newIndex === -1) {
            return;
        } else if (theIndex === -1 || newIndex < theIndex) {
            theIndex = newIndex;
            theToken = t;
        }
    });
    return {
        index: theIndex,
        token: theToken,
    };
}
