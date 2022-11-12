/**
 * 随机生成图片1000张
 */
import fs from 'fs';
import glob from 'fast-glob';

import { allSettled } from '~/utils/promise';
import { getImages } from '~/utils/getImages';
import { ffmpeg } from '~/utils/media';
import { numberToTime } from '~/utils/time';

// ------------↓修改参数↓--------------//
const NAME = '凡人修仙传';
const VIDEO_SOURCE = `E:/drama/小说/${NAME}/原视频片段`;
const OUTPUt = `E:/drama/小说/${NAME}/素材图片/草稿`;
// ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑//

const sources = glob.sync(`${VIDEO_SOURCE}/**/*.mp4`).map((src) => ({ src }));
const images = await getImages({ amounts: 2000, sources });

if (!fs.existsSync(OUTPUt)) {
    fs.mkdirSync(OUTPUt, { recursive: true });
}

function index(i: number) {
    const str = `0000${i}`;
    return `0000${i}`.substr(str.length - 4);
}

const now = Date.now();
await allSettled(images.map((img, i) => (
    () => ffmpeg(
        `-ss "${numberToTime(img.time)}" -i "${img.source.src}" -vframes 1 -q:v 2 "${OUTPUt}/${now}_${index(i)}.jpg"`,
        '生成视频图片',
    )
)));

process.exit(0);
