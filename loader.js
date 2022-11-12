import { pathToFileURL } from 'url';
import { resolve as resolveTs, getFormat, transformSource, load } from 'ts-node/esm';
import * as tsConfigPaths from 'tsconfig-paths';
import fs from 'fs';
export { getFormat, transformSource, load };

const { absoluteBaseUrl, paths } = tsConfigPaths.loadConfig();
const matchPath = tsConfigPaths.createMatchPath(absoluteBaseUrl, paths);

export function resolve(specifier, context, defaultResolver) {
    let mappedSpecifier = matchPath(specifier);
    if (mappedSpecifier) {
        const extensions = ['.ts', '.js'];
        for (const i in extensions) {
            if (fs.existsSync(`${mappedSpecifier}${extensions[i]}`)) {
                mappedSpecifier = pathToFileURL(mappedSpecifier) + extensions[i];
                break;
            }
        }
    }

    return resolveTs(mappedSpecifier || specifier, context, defaultResolver);
}
