# openui5-types

OpenUI5 TypeScript definitions, exports and (optional) runtime annotations.

## Release Notes

**0.5.0** - Breaking: Split the dist folders into types and exports.

**0.4.0** - Fork, rename and update. UI5 1.38, 1.44, 1.52, 1.54.

**0.3.0** - Create definitions for more than one version of UI5 (just 1.46 and 1.48 for now). *Be careful, now that there is these definitions inside the package and I have plans to make these definitions better (normally replacing an `any` type with a more specific one), **almost all new versions from now on may be a breaking change.***

**0.2.0** - Create my own UI5 definitions generator, because the available ones didn't fit my needs (you can still use another, just set it up in your `tsconfig.json`).

**0.1.x** - Generated exports files for all namespace sap.* objects, to make possible import these objects without creating a single `<object>.d.ts` for each imported object.

**0.0.x** - Just a draft.

## How to use definitions and exports

It is very simple, make it work with only 4 steps:

1. Install `openui5-types`, `typescript` and `@types/jquery` npm packages
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

* Add the `sap/*` path, and optionally `jquery.sap.global`.

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

Note: A future version may split up the large sap.d.ts, but referencing the index.d.ts file will include all of them.

### Resolving common typescript errors and module resolution problems

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
