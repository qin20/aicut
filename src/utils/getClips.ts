import { timeToNumber, numberToTime } from '~/utils/time';
import { getMediaDuration } from '~/utils/media';

export interface VideoSourceParam {
    src: string; // 视频文件路径
}

interface VideoSource extends VideoSourceParam {
    duration?: number; // 视频的时长，不用传，如果不传会自动获取
}

export interface Clip {
    start: number;
    end: number;
    duration: number;
    suration: string; // Duration in string
    source: VideoSource;
}

/**
 * 自动剪辑视频画面
 * @param duration 需要剪辑的时长
 * @param sources 画面的来源视频信息
 * @returns
 */
export async function getClips({
    duration,
    sources,
    min = 1000,
    max = 5000,
}: {
    duration: number; // 时间总时长
    sources: VideoSourceParam[]; // 片段来源
    min?: number; // 片段最小时长
    max?: number; // 片段最大时长
}) {
    async function getClip(): Promise<Clip> {
        const source: VideoSource = sources[Math.floor(Math.random() * sources.length)];
        if (!source.duration) {
            source.duration = timeToNumber(await getMediaDuration(source.src));
        }

        const start = Math.floor(Math.random() * source.duration);
        const end = Math.floor(Math.min(start + min + (Math.random() * (max - min)), source.duration));
        return {
            duration: end - start,
            suration: numberToTime(end - start),
            end,
            start,
            source,
        };
    }

    const clips: Clip[] = [];
    let clipTotalDuration = 0;
    while (true) {
        const clip = await getClip();
        clips.push(clip);
        clipTotalDuration += clip.duration - 3333;
        if (clipTotalDuration > duration + 600000) {
            break;
        }
    }

    return clips;
}
