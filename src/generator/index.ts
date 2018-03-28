import Generator from "./Generator";

try {
    let generator = new Generator("./src/generator/config.json5");
    generator.generate();
} catch (e) {
    console.log(e);
}
