import glob from 'fast-glob';
import fs from 'fs';
import qs from 'querystring';
import concat from 'ffmpeg-concat';
import path from 'path';
import OpenCC from 'opencc';
import { ffmpeg, getMediaDuration } from './utils/media';
import { createDir } from './utils/createDir';
import { logger } from './utils/logger';
import { getVideos } from './utils/getVideos';
import { numberToTime, timeToNumber } from './utils/time';
import { exec } from './utils/exec';

/**
 * 说用说明：
 * 1. 自动根据音频生成视频，加字幕，加水印
 */

// ------------↓修改参数↓-----------------//
const AUDIO_SOURCE = 'E:/drama/小说/诛仙/素材/音频'; // 需要合成视频的音频文件夹路径
const IMAGE_SOURCE = 'E:/drama/小说/诛仙/素材/图片'; // 静态视频路径，使用反斜杠'/'分隔文件夹
const VIDEO_SOURCE = 'E:/drama/小说/诛仙/素材/视频'; // 动态视频路径，使用反斜杠'/'分隔文件夹
const VIDEO_DEST = 'E:/drama/小说/诛仙/成片'; // 输出成片的路径
// ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑//
// ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑//

const TEMP_DIR = createDir('D:/dev/aicut/.temp/audio-to-video', false);
// @ts-ignore
const opencc = new OpenCC('s2tw.json');

async function mergeVideos(videos: string[], audio: string) {
    const output = `${TEMP_DIR}/merge_videos.mp4`;
    const videosArgs = videos.map((v) => `"${v}"`).join(' ');
    await exec(
        `python D:/dev/aicut/python/moviepy/audio-to-video.py -v ${videosArgs} -a "${audio}" -o "${output}"`,
    );
    return output;
}

function translateSRT(srt: string) {
    const output = `${srt.substring(0, srt.length - 4)}_tw.srt`;
    fs.writeFileSync(
        output,
        opencc.convertSync(fs.readFileSync(srt)),
    );
    return output;
}

async function mergeSrt(video: string, srt: string, output: string) {
    output = `${TEMP_DIR}/merge_srt.mp4`;
    const style = qs.stringify({
        Fontname: 'MicroSoft YaHei',
        Fontsize: '18',
        BackColour: '&H80000000',
        Spacing: '0.2',
        Outline: '0',
        Shadow: '0.75',
        Alignment: '2',
        MarginV: '11',
    }, ',', '=', { encodeURIComponent: (a: string) => a });
    const pad = Math.ceil(1080 * 0.11);
    await ffmpeg(
        `-i "${video}" -movflags faststart -lavfi "crop=1920:${1080 - (pad * 2)}:0:${pad},pad=1920:1080:0:${pad},subtitles='${path.basename(srt)}':force_style='${style}'" -c:a copy "${output}"`,
        { cwd: path.dirname(srt) },
    );
    return output;
}

async function mergeAudio(video: string, audio: string) {
    const output = `${TEMP_DIR}/merge_audio.mp4`;
    await ffmpeg(
        `-i "${video}" -i "${audio}" -shortest -c copy "${output}"`,
    );
    return output;
}

async function audioToVideo({
    audio,
    videos,
    srt,
}: {
    audio: string;
    videos: string[]
    srt: string;
}) {
    let temp_output = `${TEMP_DIR}/merge_audio.mp4`;
    temp_output = await mergeVideos(videos, audio);
    temp_output = await mergeAudio(temp_output, audio);
    temp_output = await mergeSrt(temp_output, srt, `${VIDEO_DEST}/${path.basename(audio)}.mp4`);
    return temp_output;
}

export async function run() {
    logger.info('正在查找音频文件...');

    const sources = [VIDEO_SOURCE, IMAGE_SOURCE].map((s) => glob.sync(`${s}/*.{mp4,MP4}`));
    const audios = glob.sync(`${AUDIO_SOURCE}/*.{mp3,MP3}`);
    for await (const audio of audios) {
        const duration = numberToTime(timeToNumber(await getMediaDuration(audio)) + 30000);
        const videos = (await getVideos({ sources, duration })).map((v) => v.file);
        const srt = translateSRT(`${audio}.srt`);
        const output = await audioToVideo({ audio, videos, srt });
        logger.info(`执行成功，${path.basename(audio)}：${output}`);
    }

    setTimeout(() => {
        run();
    }, 1000);
}

try {
    run();
} catch (e: any) {
    logger.error(e);
    process.exit(1);
}
