import fs from 'fs';

export function createDir(src: string, clear = false) {
    if (clear) {
        if (fs.existsSync(src)) {
            fs.rmdirSync(src, { recursive: true });
        }
        fs.mkdirSync(src, { recursive: true });
    } else if (!fs.existsSync(src)) {
        fs.mkdirSync(src, { recursive: true });
    }
    return src;
}
