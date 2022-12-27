import glob from 'fast-glob';
import fs from 'fs';
import qs from 'querystring';
import path from 'path';
import OpenCC from 'opencc';
import { ffmpeg, getMediaDuration } from './utils/media';
import { createDir } from './utils/createDir';
import { logger } from './utils/logger';
import { getVideos } from './utils/getVideos';
import { numberToTime, timeToNumber } from './utils/time';
import { exec } from './utils/exec';
import { random } from './utils/effects';

/**
 * 说用说明：
 * 1. 自动根据音频生成视频，加字幕，加水印
 */

// ------------↓修改参数↓-----------------//
const AUDIO_SOURCE = 'E:/drama/小说/诛仙/素材/音频'; // 需要合成视频的音频文件夹路径
const IMAGE_SOURCE = 'E:/drama/小说/诛仙/素材/图片视频'; // 静态视频路径，使用反斜杠'/'分隔文件夹
const VIDEO_SOURCE = 'E:/drama/小说/诛仙/素材/视频'; // 动态视频路径，使用反斜杠'/'分隔文件夹
const VIDEO_DEST = 'E:/drama/小说/诛仙/成片'; // 输出成片的路径
// ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑//
// ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑//

const TEMP_DIR = createDir('D:/dev/aicut/.temp/audio-to-video', false);
// @ts-ignore
const opencc = new OpenCC('s2tw.json');

async function mergeVideos({
    videos,
    audio,
    output = `${TEMP_DIR}/merge_videos.mp4`,
}: {
    videos: string[]; audio: string; output?: string;
}) {
    // 拼接 3 个 mp4s 使用 2  个 500ms directionalWipe 过渡
    const duration = await getMediaDuration(audio);
    const inputs = videos.map((v) => `-i "${v}"`).join(' ');
    const concatFilter = videos.map((v, i) => `[${i}]settb=AVTB[${i}:v];`).join('');
    const xfadeFilter = videos.map((v, i) => {
        if (i === 0) {
            return '';
        }
        let inputAlias = `v${i - 1}`;
        if (i === 1) {
            inputAlias = `${i - 1}:v`;
        }
        let format = '';
        let alias = `v${i}`;
        if (i === videos.length - 1) {
            format = ',format=yuv420p';
            alias = 'video';
        }
        return `[${inputAlias}][${i}:v]xfade=transition='${random()}':duration=2:offset=${(i * 12) - (i * 2)}${format}[${alias}];`;
    }).join('').replace(/;$/, '');
    const filterScript = `${TEMP_DIR}/filter_scripts.txt`;
    fs.writeFileSync(filterScript, `${concatFilter}${xfadeFilter}`);
    await ffmpeg(
        `${inputs} -threads 4 -filter_complex_script  "${filterScript}" -c:v libx264 -t ${duration} -map [video] "${output}"`,
    );
    return output;
}

function translateSRT(srt: string) {
    if (!fs.existsSync(srt)) {
        return '';
    }
    const output = `${srt.substring(0, srt.length - 4)}.tw.srt`;
    fs.writeFileSync(
        output,
        opencc.convertSync(fs.readFileSync(srt)),
    );
    return output;
}

async function mergeSrt({ video, srt, output = `${TEMP_DIR}/merge_srt.mp4` }: {
    video: string, srt: string, output?: string
}) {
    // const style = qs.stringify({
    //     Fontname: 'MicroSoft YaHei',
    //     Fontsize: '18',
    //     BackColour: '&H80000000',
    //     Spacing: '0.2',
    //     Outline: '0',
    //     Shadow: '0.75',
    //     Alignment: '2',
    //     MarginV: '11',
    // }, ',', '=', { encodeURIComponent: (a: string) => a });
    const pad = Math.ceil(1080 * 0.11);
    // await ffmpeg(
    //     `-i "${video}" -movflags faststart -lavfi "crop=1920:${1080 - (pad * 2)}:0:${pad},pad=1920:1080:0:${pad},subtitles='${path.basename(srt)}':force_style='${style}'" -c:a copy "${output}"`,
    //     { cwd: path.dirname(srt) },
    // );
    await ffmpeg(
        `-i "${video}" -movflags +faststart -lavfi "crop=1920:${1080 - (pad * 2)}:0:${pad},pad=1920:1080:0:${pad}" -c:a copy "${output}"`,
    );
    return output;
}

async function mergeAudio({
    video, audio, output = `${TEMP_DIR}/merge_audio.mp4`,
} : {
    video: string,
    audio: string,
    output?: string,
}) {
    await ffmpeg(
        `-i "${video}" -i "${audio}" -shortest -c copy "${output}"`,
    );
    return output;
}

/**
 * 音频变声
 * @param audio
 * @returns
 */
async function picth(audio: string) {
    const wav = `${TEMP_DIR}/audio.wav`;
    await ffmpeg(`-i "${audio}" "${wav}"`);
    const pitch = `${TEMP_DIR}/audio_pitch.wav`;
    await exec(`soundstretch "${wav}" "${pitch}" -pitch=+1.5`, {
        output: '',
    });
    const mp3 = `${TEMP_DIR}/audio_pitch.mp3`;
    await ffmpeg(`-i "${pitch}" "${mp3}"`);
    return mp3;
}

async function audioToVideo({
    audio,
    videos,
    srt,
    output,
}: {
    audio: string;
    videos: string[]
    srt: string;
    output: string;
}) {
    audio = await picth(audio);
    let video = '';
    video = await mergeVideos({ videos, audio });
    video = await mergeAudio({ video, audio });
    video = await mergeSrt({ video, srt, output });
    return output;
}

export async function run() {
    const sources = [
        VIDEO_SOURCE,
        IMAGE_SOURCE,
    ].map((s) => glob.sync(`${s}/*.{mp4,MP4}`));
    const audios = glob.sync(`${AUDIO_SOURCE}/*.{mp3,MP3}`).filter((audio) => {
        const dest = `${audio}.mp4`;
        return !fs.existsSync(dest);
    });

    if (audios.length) {
        const audio = audios[0];
        const dest = `${audio}.mp4`;
        logger.info(`开始处理，${audio}`);
        const now = Date.now();
        const audioDuration = timeToNumber(await getMediaDuration(audio));
        const duration = numberToTime(audioDuration + (audioDuration / 12000 * 2000) + 60000);
        const videos = (await getVideos({ sources, duration })).map((v) => v.file);
        const srt = translateSRT(`${audio}.srt`);
        const output = await audioToVideo({ audio, videos, srt, output: dest });
        logger.info(`执行成功，耗时：${(Date.now() - now) / 1000}s，${path.basename(audio)}：${output}`);
    }

    const t = setTimeout(() => {
        clearTimeout(t);
        main();
    }, 1000);
}

async function main() {
    logger.info('正在查找音频文件...');
    await run();
}

// 内存泄漏解决方案，不能直接在外层try catch，也不要使用递归调用
// 封装一个main函数，在run里面去掉用main，main在调用run
main();
