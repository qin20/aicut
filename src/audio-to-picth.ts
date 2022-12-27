import fs from 'fs';
import path from 'path';
import glob from 'fast-glob';
import { logger } from '~/utils/logger';
import { ffmpeg } from '~/utils/media';
import { exec } from '~/utils/exec';
import { allSettled } from './utils/promise';
import { createDir } from './utils/createDir';

/**
 * 说用说明：
 * 1.
 */

// ------------↓修改参数↓-----------------//
const AUDIO_DIR = 'E:/drama/小说/诛仙/素材/音频'; // 需要转化的音频文件夹路径
// ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑//

const TEMP_DIR = createDir('D:/dev/aicut/.temp/audio-to-picth', true);

async function run() {
    const audios = glob.sync(`${AUDIO_DIR}/*.mp3`).filter((audio) => {
        const picthed = `${audio}.pitch.MP3`;
        // return !fs.existsSync(picthed);
        return true;
    });

    if (audios.length) {
        await allSettled(audios.map((audio) => async () => {
            const wav = `${TEMP_DIR}/${path.basename(audio)}.wav`;
            await ffmpeg(`-i "${audio}" "${wav}"`);
            const pitch = `${TEMP_DIR}/${path.basename(audio)}.pitch.wav`;
            await exec(`soundstretch "${wav}" "${pitch}" -pitch=+1.5 -tempo=+5`, {
                output: '',
            });
            // 区分大写MP3
            const picthed = `${audio}.pitch.MP3`;
            await ffmpeg(`-i "${pitch}" "${picthed}"`);
            return picthed;
        }));
    }

    setTimeout(() => {
        run();
        logger.info('正在查找音频文件...');
    }, 5000);
}

try {
    run();
} catch (e: any) {
    logger.error(e);
    process.exit(1);
}
