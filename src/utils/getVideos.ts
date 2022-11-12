import fs from 'fs';
import { getMediaDuration } from '~/utils/media';
import { timeToNumber } from '~/utils/time';

type VVedio = Awaited<ReturnType<typeof pickVideo>>;

async function pickVideo(sources: string[], picked: string[]) {
    // 为了防止重复，会在发现重复的时候，自动重新选择
    // 如果重选了100次还是重复，则不重新选了，直接返回随机一个
    let maxLoop = picked.length
        ? Math.ceil((sources.length - picked.length) / picked.length)
        : 1;

    async function addInfo(file: string) {
        const stat = fs.statSync(file);
        return { file, duration: timeToNumber(await getMediaDuration(file)), stat };
    }

    while (maxLoop--) {
        const file = sources[Math.floor(sources.length * Math.random())];
        if (!picked.includes(file)) {
            return addInfo(file);
        }
    }

    return addInfo(sources[Math.floor(sources.length * Math.random())]);
}

export async function getVideos({
    sources,
    duration = '00:20:00',
}: {
    sources: string[][];
    duration: string;
}) {
    const existsFiles: string[] = [];
    const videos: VVedio[] = [];
    let totalDuration = 0;
    while (totalDuration <= timeToNumber(duration)) {
        const inputs: string[] = sources[videos.length % sources.length];
        const v = await pickVideo(inputs, existsFiles);
        videos.push(v);
        const { file, duration } = v;
        existsFiles.push(file);
        totalDuration += duration;
    }

    return videos;
}
