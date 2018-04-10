# openui5-types

OpenUI5 TypeScript definitions and modules.
(TODO runtime decorators).

- types are exposed on the `sap` namespace (i.e. `sap.m.List`).
- modules provide imports like `import SAPList from "sap/m/List`

You can optionally use just the types, but to take full advantage of TypeScript, the modules are also recommended.

## Configuring definitions and exports

1. Install `openui5-types` and `@types/jquery` npm packages.
    - Optionally add `@types/qunit` and `@types/sinon` for tests.
2. Add the required TypeScript options in the tsconfig.json

### 1) Install `openui5-types` and `@types/jquery` npm packages

```sh
npm install openui5-types --save-dev
npm install @types/jquery --save-dev
```

Or with yarn:

```sh
yarn add --dev openui5-types
yarn add --dev @types/jquery
```

### 2) Add the required TypeScript options in the tsconfig.json

- Add the `sap/*` path, and optionally `jquery.sap.global`.

Example of `tsconfig.json` file:

```json
{
    "compilerOptions": {
        "target": "esnext",
        "module": "ESNext",
        "strict": true,
        "strictPropertyInitialization": false,
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "baseUrl": "./",
        "outDir": ".build/ts-out",
        "rootDir": "./src",
        "paths": {
            "sap/*": [
                "./node_modules/openui5-types/dist/1.52/exports/sap/*"
            ],
            "jquery.sap.global": [
                "./node_modules/openui5-types/dist/1.52/exports/jquery.sap.global.d.ts"
            ],
            "your/app/namespace/*": [
                "./src/*"
            ]
        }
    },
    "files": [
        "node_modules/openui5-types/dist/types/1.52/types/index.d.ts"
    ],
    "include": [
        "src/**/*",
    ],
    "exclude": [
        "**/*.spec.ts"
    ]
}
```

Note 1: A future version may split up the large sap.d.ts, but referencing the index.d.ts file will include all of them.

Note 2: This configurations outputs ESNext modules which will require further compilation to work with UI5 and older browsers. Other configurations may be used depending on use cases.

## Type Usage

After the configurations, you can use the types in your code.

```ts
const list = this.byId("list") as sap.m.List;
```

## Module usage

Using the modules may require either a babel compilation step after the typescript compiler runs in order to work with UI5, or a runtime library along with decorators in the code. Both of these approaches also provide a way to use and transform ES6 classes.

- [babel-plugin-transform-modules-ui5](https://github.com/r-murphy/babel-plugin-transform-modules-ui5)
- [ui5ts decorator](https://github.com/lmcarreiro/ui5ts)
  - Note that the latest version of this project also contains UI5 types. If you just want the decorator, you can use an older version.

**Disclaimer** I'm the author of the babel plugin, so I am biased towards that approach. I have not yet tried the decorator approach.

You *may* be able to use `sap.ui.define` to include UI5 modules without using ES `import` syntax. But the modules will have `any` type and will need to be casted to have the most usefulness. But if this is your preference to avoid an additional compilation or runtime dependency, then give it a try.

## Example

- [r-murphy openui5-masterdetail-app-ts](https://github.com/r-murphy/openui5-masterdetail-app-ts). Using babel/compile approach for modules.

- [lmcarreiro ui5-typescript-example](https://github.com/lmcarreiro/ui5-typescript-example). Using decorator/runtime approach for modules.

- [apazureck ui5-typescript-example](https://github.com/apazureck/ui5-typescript-example). Fork of lmcarreiro's example.

## Transforming ES modules and classes

Check out my babel plugin [babel-plugin-transform-modules-ui5](https://github.com/r-murphy/babel-plugin-transform-modules-ui5).

## Resolving common issues

**Problem:** Doesn't find your own `*.ts` class:

```typescript
...
// error TS2307: Cannot find module 'your/app/namespace/folder/ClassName'.
import ClassName from "your/app/namespace/folder/ClassName";
...
```

**Solution:** Make sure you have the path of your namespace root in the `tsconfig.json` and if it match with your application startup in the `index.html`

```diff
...
"compilerOptions": {
    ...
    "baseUrl": "./",
    "paths": {
        ...
+       "your/app/namespace/*": [ "./src/*" ]
    }
...
```

**Problem:** Doesn't find a class in sap.* namespace:

```typescript
...
// error TS2307: Cannot find module 'sap/ui/core/UIComponent'.
import UIComponent from "sap/ui/core/UIComponent";
...
```

**Solution:** Make sure you have mapped the **openui5-types** exports folder in your paths of the `tsconfig.json`:

```diff
...
"compilerOptions": {
    ...
    "baseUrl": "./",
    "paths": {
        ...
+       "sap/*": [ "./node_modules/openui5-types/dist/1.52/sap/*" ]
    }
...
```

If the problem still remains, please, create an issue in the github project.

## Future Plans

There is a discussion with apazureck on whether the module exports should use ES6 modules (`export default sap.Module;`) or CommonJS modules (`export = sap.Module;`). At this time on the ES6 module approach is supported by the babel plugin. But after supporting CommonJS and AMD module support in the babel plugin, this projects exports may be updated.

## Release Notes

**0.5.0** - Breaking: Split the dist folders into types and exports.

**0.4.0** - Fork, rename and update. UI5 1.38, 1.44, 1.52, 1.54.

**0.3.0** - Create definitions for more than one version of UI5 (just 1.46 and 1.48 for now). *Be careful, now that there is these definitions inside the package and I have plans to make these definitions better (normally replacing an `any` type with a more specific one), **almost all new versions from now on may be a breaking change.***

**0.2.0** - Create my own UI5 definitions generator, because the available ones didn't fit my needs (you can still use another, just set it up in your `tsconfig.json`).

**0.1.x** - Generated exports files for all namespace sap.* objects, to make possible import these objects without creating a single `<object>.d.ts` for each imported object.

**0.0.x** - Just a draft.
