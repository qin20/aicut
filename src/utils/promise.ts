import { logger, progress } from './logger';
import { numberToTime } from './time';

interface AllSettledOptions {
    max?: number; // 并发数量
    showProgress?: boolean; // 显示进度条
}

export async function allSettled <T=any>(
    promises: (() => Promise<T>)[],
    options?: AllSettledOptions,
): Promise<{
    results: T[];
    allResults: PromiseSettledResult<Awaited<T>>[];
}> {
    const { max = 5 } = options || {};
    const allResults: PromiseSettledResult<Awaited<T>>[] = [];
    logger.info(`开始执行任务: ${promises.length}，并发${max}`);
    const bar = progress('正在执行任务', promises.length).start();
    const maxLength = promises.length;
    const now = Date.now();
    let count = 0;
    const { level } = logger;
    logger.level = 'fatal'; // 禁用输出
    while (promises.length) {
        const ret = await Promise.allSettled(promises.splice(0, max).map(async (f) => {
            const start = Date.now();
            const r = await f();
            const end = Date.now() - start;
            bar.update(++count, { rest: numberToTime(end * (maxLength - count) / max).substring(0, 8) });
            return r;
        }));
        allResults.push(...ret);
    }
    bar.stop();
    logger.level = level || 'info';
    logger.info(`执行任务完成，耗时: ${numberToTime(Date.now() - now)}。`);
    return {
        results: allResults.filter((r) => r.status === 'fulfilled').map((r: any) => r.value as T),
        allResults,
    };
}
