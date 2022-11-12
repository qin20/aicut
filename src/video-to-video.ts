import glob from 'fast-glob';
import path from 'path';

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
const NOVEL = '凡人修仙传';
const VIDEO_SOURCE = `E:/drama/小说/${NOVEL}/原视频片段`; // 源视频文件路径，使用反斜杠'/'分隔文件夹
const OUTPUT = `E:/drama/小说/${NOVEL}/素材视频`; // 结果保存路径
const CLIP_TIME = '00:00:12.00'; // 每个片段的长度12s
// ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑//

export interface Clip {
    start: number;
    end: number;
    file: string; // Duration in string
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
            clips.push({ end, start, file });
        });
    }

    return clips;
}

async function extract() {
    const clips = await getClips();
    await allSettled(clips.map((clip) => () => {
        const name = [path.basename(clip.file), clip.start, clip.end].join('_');
        const ss = numberToTime(clip.start);
        const to = numberToTime(clip.end - clip.start);
        return ffmpeg(
            `-ss "${ss}" -i "${clip.file}" -to "${to}" -filter:v fps=23 -intra -an "${OUTPUT}/${name}.mp4"`,
        );
    }), { max: 1 });
}

async function main() {
    await extract();
}

try {
    await main();
    logger.info('导入成功');
    process.exit(0);
} catch (e: any) {
    logger.error(e);
    process.exit(1);
}
