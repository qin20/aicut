//backend
import { ActionFunction, DataFunctionArgs, json } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import glob from '~/utils/fast-glob.server';
import path from 'path';
import url from 'url';
import { rmSync, readdirSync } from '~/utils/fs.server';
import { db } from '~/utils/db.server';
import type { AudioToSrtTask } from '@prisma/client';

// frontend
import { useCallback, useEffect, useRef, useState } from 'react';
import * as KeyCode from 'keycode-js';

async function upsertTask({ request }: DataFunctionArgs) {
  const formData = await request.formData();
  const src = formData.get('src') as string;
  const start = formData.get('start') as string;
  const end = formData.get('end') as string;

  await db.audioToSrtTask.upsert({
    where: { src },
    create: {
      src, start, end, state: 'INITED',
    },
    update: {
      src, start, end, state: 'INITED',
    }
  });

  return json(null);
}

async function deleteTaskAndImage({ request }: DataFunctionArgs) {
  const formData = await request.formData();
  const src = formData.get('src') as string;
  rmSync(src, { force: true }); // 删除图片
  const task = await db.audioToSrtTask.findUnique({ where: { src } });
  if (task) {
    await db.audioToSrtTask.delete({ where: { src }}).catch(); // 删除任务
  }
  return json(null);
}

export const action: ActionFunction = async (params) => {
  const { request } = params;
  if (request.method === 'POST') {
    return await upsertTask(params);
  } else if (request.method === 'DELETE') {
    return await deleteTaskAndImage(params);
  }
  return json(null);
}

export async function loader() {
  const dir = 'e:/drama/小说/诛仙/诛仙-北冥有声播讲';
  const audios = readdirSync(dir).sort().map((file) => path.join(dir, file)).filter((file) => file.match(/mp3$/i));
  const task = await db.audioToSrtTask.findMany({ where: { src: { in: audios } }});
  const taskMap: Record<string, AudioToSrtTask | undefined> = task.reduce((ret, t) => {
    return { ...ret, [t.src]: t };
  }, {});
  const data = audios.map((src) => ({
    ...taskMap[src],
    src,
    name: path.basename(src),
    http_src: `/static?path=${encodeURIComponent(src)}`,
  }));
  return json(data);
}

export default function Index() {
  const audios = useLoaderData<(AudioToSrtTask & { http_src: string; name: string; })[]>();
  const [index, setIndex] = useState<number>(-1);
  const audio = audios[index] || audios[0];
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  // 跳转到下一张的时候自动保存任务
  const saveFetcher = useFetcher();
  const gotoNext = () => {
    saveFetcher.submit({
      ...audio,
      start,
      end,
    } as any, {
      method: 'post',
    });
    setIndex(Math.min(index + 1, audios.length - 1));
  };

  useEffect(() => {
    const index = window.localStorage.getItem('audio_index');
    if (index !== null) {
      setIndex(+index);
    }
    const start = window.localStorage.getItem('audio_start');
    if (start !== null) {
      setStart(start);
    }
    const end = window.localStorage.getItem('audio_end');
    if (end !== null) {
      setEnd(end);
    }
  }, []);
  useEffect(() => {
    const onKeyPress = (e: KeyboardEvent) => {
      if (e.key === KeyCode.CODE_LEFT) {
        setIndex(Math.max(index - 1, 0));
      } else if (e.key === KeyCode.CODE_RIGHT) {
        gotoNext();
      }
    };
    if (index !== -1) {
      window.localStorage.setItem('audio_index', index as unknown as string);
    }
    window.addEventListener('keyup', onKeyPress);
    return () => {
      window.removeEventListener('keyup', onKeyPress);
    };
  }, [index]);

  return (
    <div className="p-10 text-center">
      <div className="space-x-4 uppercase">
        <label className="space-x-1">
          开始：
          <input type="text" value={start} onChange={(e) => {
            window.localStorage.setItem('audio_start', e.target.value);
            setStart(e.target.value);
          }} className="border w-30" />
        </label>
        <label className="space-x-1">
          结束：
          <input type="text" value={end} onChange={(e) => {
            window.localStorage.setItem('audio_end', e.target.value);
            setEnd(e.target.value);
          }} className="border w-30" />
        </label>
        <label className="space-x-1">
          index：
          <input type="text" value={index} onChange={(e) => setIndex(+e.target.value)} className="border w-10" />
          {' '} / {audios.length}
        </label>
      </div>
      <div className="flex pt-10 pb-3 justify-center">{audio.name}</div>
      <div className="flex justify-center">
        <div className="relative" style={{ width: 1000 }}>
          <audio src={audio.http_src} controls className="w-full" preload="metadata"></audio>
        </div>
      </div>
      <div className="mt-4 space-x-4">
        <button className="btn-primary" onClick={() => setIndex(Math.max(index - 1, 0))}>上一个</button>
        <button className="btn-primary" onClick={gotoNext}>下一个</button>
      </div>
    </div>
  );
}
