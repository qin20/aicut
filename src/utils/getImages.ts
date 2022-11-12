import { timeToNumber } from '~/utils/time';
import { getMediaDuration } from '~/utils/media';
import { allSettled } from '~/utils/promise';

interface VideoSourceParam {
    src: string; // 视频文件路径
}

interface VideoSource extends VideoSourceParam {
    duration?: number; // 视频的时长，不用传，如果不传会自动获取
}

export interface Frame {
    createAt: number;
    time: number;
    source: VideoSource;
}

export async function getImages({
    amounts = 5,
    sources,
}: {
    amounts?: number; // 需要生成多少张图片
    sources: VideoSourceParam[]; // 片段来源
}) {
    async function getImage() {
        const source: VideoSource = sources[Math.floor(Math.random() * sources.length)];
        if (!source.duration) {
            source.duration = timeToNumber(await getMediaDuration(source.src));
        }

        const time = Math.floor(Math.random() * source.duration);
        return {
            createAt: Date.now(),
            time,
            source,
        };
    }

    const { results } = await allSettled(
        new Array(amounts).fill(1).map(() => () => getImage()),
    );

    return results;
}
