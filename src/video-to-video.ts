import glob from 'fast-glob';
import path from 'path';
import fs from 'fs';

import { allSettled } from '~/utils/promise';
import { getMediaDuration, ffmpeg } from '~/utils/media';
import { logger } from '~/utils/logger';
import { numberToTime, timeToNumber } from '~/utils/time';
import { range } from '~/utils/range';

/**
 * 说用说明
 * 1. 修改参数
 * 4. 运行代码
 */

// ------------↓修改参数↓--------------//
const NOVEL = '诛仙';
const VIDEO_SOURCE = `E:/drama/小说/${NOVEL}/原视频`; // 源视频文件路径，使用反斜杠'/'分隔文件夹
const VIDEO_DEST = `E:/drama/小说/${NOVEL}/素材/视频`; // 结果保存路径
const CLIP_TIME = '00:00:12.00'; // 每个片段的长度12s
// ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑//

export interface Clip {
    start: number;
    end: number;
    file: string; // Duration in string
    dest: string;
}

export default async function getClips() {
    const files = glob.sync(`${VIDEO_SOURCE}/**/*.mp4`);
    const clips: Clip[] = [];
    const clipDuration = timeToNumber(CLIP_TIME);
    for await (const file of files) {
        const duration = timeToNumber(await getMediaDuration(file));
        range(Math.ceil(duration / clipDuration)).forEach((i) => {
            const start = (i - 1) * clipDuration;
            const end = Math.min(duration, start + clipDuration);
            const name = [
                path.basename(file),
                Math.floor(start / 1000),
                Math.floor(end / 1000),
            ].join('_');
            clips.push({ end, start, file, dest: `${VIDEO_DEST}/${name}.mp4` });
        });
    }
    return clips;
}

async function run() {
    const clips = await getClips();
    await allSettled(clips.map((clip) => () => {
        if (fs.existsSync(clip.dest)) {
            return Promise.resolve();
        }
        const ss = numberToTime(clip.start);
        const to = numberToTime(clip.end - clip.start);
        return ffmpeg(
            `-ss "${ss}" -i "${clip.file}" -to "${to}" -filter:v fps=25 -an "${clip.dest}"`,
        );
    }), { max: 1 });
}

try {
    run();
} catch (e: any) {
    logger.error(e);
    process.exit(1);
}
