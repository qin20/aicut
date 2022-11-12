import fs from 'fs';
import path from 'path';
import { formatTime } from './time';
import { exec, execGetOutput } from './exec';

import type { SpawnOptions } from 'child_process';

const binPath = path.resolve('./bin/');

export function ffmpeg(cmd: string, options?: SpawnOptions) {
    return exec(
        `${binPath}/ffmpeg -hwaccel cuda -y -hide_banner -loglevel error ${cmd}`,
        options,
    );
}

export function ffmpegGetOutput(cmd: string, desc: string) {
    return execGetOutput(
        `${binPath}/ffmpeg -hwaccel cuda -y -hide_banner -loglevel error ${cmd}`,
        desc,
    );
}

export function ffprobe(cmd: string, desc: string) {
    return execGetOutput(`${binPath}/ffprobe ${cmd}`, desc);
}

export function saveCachePath(src: string) {
    return path.resolve(`public/.cache/${src}`);
}

export function getCachePath(cachePath?: string | null) {
    if (!cachePath) {
        return '';
    }

    return `\\${path.relative(path.resolve('public'), cachePath)}`;
}

/**
 * 获取多媒体总时长
 */
export async function getMediaDuration(src: string) {
    const duration = await ffprobe(
        `-i "${src}" -show_entries format=duration -v quiet -of csv="p=0" -sexagesimal`,
        '获取媒体时长',
    );
    return formatTime(duration);
}

/**
 * 获取动态封面
 * @param src
 * @param output
 * @returns
 */
export async function getPosterGif(src: string, output: string) {
    if (!src) {
        return;
    }

    if (!fs.existsSync(output)) {
        fs.mkdirSync(path.dirname(output), { recursive: true });
    }

    await ffmpeg(
        `-i "${src}" -vf "fps=24,scale=320:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 "${output}"`,
    );
    return output;
}

/**
 * 获取视频封面
 * @param src
 * @returns
 */
export async function getPoster(src: string, time: string, output: string) {
    if (!fs.existsSync(output)) {
        fs.mkdirSync(path.dirname(output), { recursive: true });
    }

    const startTime = time ? `-ss ${time}` : '';
    await ffmpeg(
        `${startTime} -i "${src}" -vframes 1 -q:v 2 "${output}"`,
    );
    return output;
}

export async function cutVideo(source: string, start: string, end: string, output: string) {
    if (!fs.existsSync(path.dirname(output))) {
        fs.mkdirSync(path.dirname(output), { recursive: true });
    }

    await ffmpeg(
        `-i "${source}" -ss "${start}" -to "${end}" -intra -c copy ${output}`,
    );
    return output;
}

export async function concatMedias(sources: string[], output: string) {
    const dest = path.dirname(output);
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const txtSrc = `${dest}/medias.txt`;
    fs.writeFileSync(txtSrc, sources.map((s) => `file ${s.replace(/\\/g, '/')}`).join('\n'));
    await ffmpeg(
        `-f concat -safe 0 -i "${txtSrc}" -c copy "${output}"`,
    );
    return output;
}
