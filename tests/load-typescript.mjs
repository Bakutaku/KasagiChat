import { readFileSync } from "node:fs";
import { Module } from "node:module";
import path from "node:path";
import ts from "typescript";

// ブラウザ不要のロジックだけをメモリ上で変換します。生成物をソースへ書きません。
const cache = new Map();
export function loadTypescript(file) {
  const filename = path.resolve(file);
  if (cache.has(filename)) return cache.get(filename).exports;
  const compiledModule = new Module(filename);
  cache.set(filename, compiledModule);
  compiledModule.require = (id) => {
    if (!id.startsWith(".")) throw new Error(`Unexpected dependency: ${id}`);
    return loadTypescript(path.resolve(path.dirname(filename), `${id}.ts`));
  };
  const source = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  compiledModule._compile(source, filename);
  return compiledModule.exports;
}
