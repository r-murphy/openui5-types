
import TypeUtil from "../util/TypeUtil";

interface Type {
    generateTypeScriptCode(): string;
}

export default class Types {

    // private readonly originalTypeString: string;
    private readonly types: Set<Type>;

    private cachedTsString?: string;

    constructor(typesString: string) {
        // this.originalTypeString = typeString;
        this.types = new Set(parseTypeString(typesString));
    }

    public generateTypeScriptCode() {
        if (!this.cachedTsString) {
            this.cachedTsString = Array.from(this.types).map((t) => t.generateTypeScriptCode()).sort().join(" | ");
        }
        return this.cachedTsString;
    }

    public isCompatibleForParameter(other: Types): boolean {
        if (this.isEqual(other)) {
            return true;
        }
        if (other.hasAny()) {
            return true;
        } else {
            return false;
        }
                // if (this.type.split("|").some(t => other.hasType(t.trim()))) {
        //     return true;
        // }
        // if (this.hasArray() && other.hasAnyArray()) {
        //     return true;
        // }
        // if (other.hasType("object"))
        // if (other.type === "any[]" || this.type === "any[]") return true;
        // else if (this.type === "string" && other.type === "any") return false;
        // else if (this.type === "any")
    }

    public addAny() {
        if (!this.hasAny()) {
            this.cachedTsString = undefined;
            this.types.add(anySingleton);
        }
    }

    private isOne() {
        return this.types.size === 1;
    }

    public isAny() {
        // if (this.isArray) return false;
        return this.isOne() && this.has(anySingleton);
    }

    public isVoid() {
        return this.isOne() && this.has(voidSingleton);
    }

    public isThis() {
        // if (this.isArray) return false;
        return this.isOne() && this.has(thisSingleton);
    }

    private hasAny() {
        this.types.has(anySingleton);
    }

    private has(t: string | BasicType) {
        return this.types.has(BasicTypeFactory(t));
    }

    public isEqual(other: Types) {
        if (this.types.size !== other.types.size) {
            return false;
        }
        for (let t of this.types.values()) {
            if (!other.types.has(t)) {
                return false;
            }
        }
        return true;
    }

    public toString() {
        return this.generateTypeScriptCode();
    }

}

/**
 * string | any | number | x.y.Z
 */
class BasicType implements Type {
    private readonly type: string;
    constructor(type: string) {
        this.type = type;
    }
    public generateTypeScriptCode() {
        return this.type;
    }
}

const typeInstanceMap: { [name: string]: Type } = {};

function BasicTypeFactory(type: string | BasicType): BasicType {
    if (type instanceof BasicType) {
        return type;
    }
    let instance = typeInstanceMap[type];
    if (!instance) {
        instance = new BasicType(type);
        typeInstanceMap[type] = instance;
    }
    return instance as BasicType;
}

const anySingleton = BasicTypeFactory("any");
const voidSingleton = BasicTypeFactory("void");
const thisSingleton = BasicTypeFactory("this");
// const numberSingleton = BasicTypeFactory("number");
// const booleanSingleton = BasicTypeFactory("boolean");
// const stringSingleton = BasicTypeFactory("string");

/**
 * i.e. Promise<A|B> or Wrapper<Promise<A|A>>
 */
class WrappedType implements Type {
    private readonly wrapper: string;
    protected readonly wrapped: Type[];
    constructor(wrapper: string, wrapped: string) {
        this.wrapper = wrapper;
        this.wrapped = parseTypeString(wrapped);
    }
    public generateTypeScriptCode() {
        let wrappedString = this.wrapped.map((t) => t.generateTypeScriptCode()).join("|");
        return `${this.wrapper}<${wrappedString}>`;
    }
}

/**
 * Array<X|Y> or Array<X|Promise<X> or X[]
 */
class ArrayType extends WrappedType {
    constructor(wrapped: string) {
        super("Array", wrapped);
    }
    public generateTypeScriptCode() {
        let first = this.wrapped[0];
        if (this.wrapped.length > 1 || first instanceof WrappedType) {
            return super.generateTypeScriptCode();
        } else {
            return `${first.generateTypeScriptCode()}[]`;
        }
    }
}

function parseTypeString(typeString: string): Type[] {
    let typeArray = TypeUtil.splitTypeString(typeString);
    return typeArray.map((t) => {
        t = t.trim();
        if (t.endsWith("]")) {
            let arrayOf = t.substring(0, t.indexOf("["));
            return new ArrayType(arrayOf);
        } else if (t.startsWith("Array<")) {
            let arrayOf = t.substring("Array<".length, t.length - 1).trim();
            return new ArrayType(arrayOf);
        } else if (t.includes("<")) {
            let start = t.indexOf("<");
            let wrapper = t.substring(0, start);
            let wrapped = t.substring(start + 1, t.length - 1).trim();
            return new WrappedType(wrapper, wrapped);
        } else {
            return BasicTypeFactory(t);
        }
    });
}

//

/*

any | any[] | Array<one|two> | Array<one>"

    T: any
    T: Array
        T: any
    Array
        one
        two
    Array
        one

*/
