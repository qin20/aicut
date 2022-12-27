import fs from 'fs';
import path from 'path';
import glob from 'fast-glob';

import { getClips } from '~/utils/getClips';
import { ffmpeg, getMediaDuration } from '~/utils/media';
import { numberToTime, timeToNumber } from '~/utils/time';

declare interface AudioFile { file: string; duration?: number; }

const videoDir = 'E:\\drama\\小说\\完美世界\\videos_audit\\**\\*.mp4'.replace(/\\/g, '/');
const sources = glob.sync(videoDir).map((src) => ({
    src,
}));

const random = async (name: string, duration: string) => {
    const clips = await getClips({ duration: timeToNumber(duration), sources, min: 9999, max: 13333 });
    const output = `D:/drama/小说/完美世界片段/${name}`;
    let index = 1;

    if (fs.existsSync(output)) {
        fs.rmSync(output, { recursive: true });
    }

    fs.mkdirSync(output, { recursive: true });

    for await (const clip of clips) {
        await ffmpeg(
            `-i "${clip.source.src}" -ss "${numberToTime(clip.start)}" -to "${numberToTime(clip.end)}" -intra -c:v copy "${output}/${index++}.mp4"`,
        );
    }
};

// 单个生成
// const duration = await getMediaDuration(audios[77 - 1].file);
// await random('0077', duration);

const audioDir = 'E:\\drama\\小说\\完美世界\\完美世界音频\\**\\*.mp3'.replace(/\\/g, '/');
const audios: AudioFile[] = glob.sync(audioDir).map((file) => ({ file }));

// 批量生成
// npm run 'get-clips'
// 233集 对 72级
// 停止：ctrl-c
// 完美世界0683语音对86集
console.log(audios.length);
for await (const audio of audios) {
    const index = audios.indexOf(audio);
    if (index <= 720 - 10) {
        continue;
    }

    const name = path.basename(audio.file);
    const duration = await getMediaDuration(audio.file);
    await random(name, duration);
}
