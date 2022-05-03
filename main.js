import {
  rollup
} from 'rollup';

import { dirname, join } from "path";


function mixinPlugin(bundle) {
    return {
        name: "mixin",
        resolveId(source, importer) {
            try {
                if (typeof importer === "undefined") {
                    return source;
                } else {
                    const dir = dirname(importer);
                    const resolved = join(dir, source);
                    return resolved in bundle ? resolved : false;
                }
            } catch (error) {
                console.log("resolveId", error);
                return null;
            }
        },
        load(id) {
            const chunk = bundle[id];
            if (chunk) {
                // remove chunk from bundle
                if (Object.values(bundle).filter(c => c.type === "chunk" && c.imports.includes(chunk.fileName)).length < 1) {
                    delete bundle[id];
                }
                return {
                    code: chunk.code,
                    map: chunk.map,
                };
            } else {
                return null;
            }
        },
    }
}

const mixinChunksForIIFE = async(context, entry, bundle) => {
  const build = await rollup({
    input: entry.fileName,
    plugins: [mixinPlugin(bundle)]
  });
  const outputs = (await build.generate({
    format: "iife"
  })).output;
  if (outputs.length < 1) {
    throw new Error("");
  } else if (outputs.length > 1) {
    throw new Error("mix content script chunks error: output must contain only one chunk.");
  }

  const outputChunk = outputs[0];

  const referenceId = context.emitFile({
      type: "asset",
      source: outputChunk.code,
      fileName: entry.fileName
  });
  return context.getFileName(referenceId);
}




//const hasRepeat = arr => { return arr.length !== [...new Set(arr)].length }
const processorWithIIFE = {
  singleScripts: [],
  generateBundle: (context, bundle) => {
    const chunk = bundle['content.js'];
    if (chunk) {
      await mixinChunksForIIFE(context, chunk, bundle);
    }

  }
}


export const chromeExtension = (fileNames) => {

  if (!isArray(fileNames)) {
    return
  }

  return {
    name: "chrome-extension",
    async generateBundle(options, bundle, isWrite) {
      console.log('111');
      processorWithIIFE.singleScripts = fileNames;
      await processorWithIIFE.generateBundle(this, bundle);
    }
  }
}