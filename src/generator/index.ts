import Generator from "./Generator";

try {
    let generator = new Generator("./src/generator/config.json5", "./src/generator/config-local.json");
    generator.generate();
}
catch (e) {
    console.log(e);
    debugger;
}
