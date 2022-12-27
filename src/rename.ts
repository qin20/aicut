import fs from 'fs';
import glob from 'fast-glob';
import path from 'path';

const files = glob.sync('E:/drama/小说/诛仙/素材/音频/*.srt');
files.forEach((f) => {
    const dirname = path.dirname(f);
    const basename = path.basename(f);
    const name = (basename.trim().split('.')[0]);
    console.log(`${dirname}/${name}.mp3.srt`);
    fs.renameSync(f, `${dirname}/${name}.mp3.srt`);
});
