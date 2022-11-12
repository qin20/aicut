//backend
import { ActionFunction, DataFunctionArgs, json } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import glob from '~/utils/fast-glob.server';
import path from 'path';
import url from 'url';
import { rmSync, readdirSync } from '~/utils/fs.server';
import { db } from '~/utils/db.server';
import type { ImageVideoTask } from '@prisma/client';

// frontend
import { useCallback, useEffect, useRef, useState } from 'react';
import * as KeyCode from 'keycode-js';

async function upsertTask({ request }: DataFunctionArgs) {
  const formData = await request.formData();
  const src = formData.get('src') as string;
  const width = +(formData.get('width') as unknown as number);
  const height = +(formData.get('height') as unknown as number);
  const originX = +(formData.get('originX') as unknown as number);
  const originY = +(formData.get('originY') as unknown as number);
  const clipTop = +(formData.get('clipTop') as unknown as number);
  const clipRight = +(formData.get('clipRight') as unknown as number);
  const clipBottom = +(formData.get('clipBottom') as unknown as number);
  const clipLeft = +(formData.get('clipLeft') as unknown as number);

  await db.imageVideoTask.upsert({
    where: { src },
    create: {
      src, width, height, originX, originY, clipTop, clipRight, clipBottom, clipLeft, state: 'INITED',
    },
    update: {
      src, width, height, originX, originY, clipTop, clipRight, clipBottom, clipLeft, state: 'INITED',
    }
  });
  return json(null);
}

async function deleteTaskAndImage({ request }: DataFunctionArgs) {
  const formData = await request.formData();
  const src = formData.get('src') as string;
  rmSync(src, { force: true }); // 删除图片
  const task = await db.imageVideoTask.findUnique({ where: { src } });
  if (task) {
    await db.imageVideoTask.delete({ where: { src }}).catch(); // 删除任务
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
  const dir = 'e:/drama/小说/凡人修仙传/素材图片/草稿';
  const imgs = readdirSync(dir).sort().map((file) => path.join(dir, file));
  const task = await db.imageVideoTask.findMany({ where: { src: { in: imgs } }});
  const taskMap: Record<string, ImageVideoTask | undefined> = task.reduce((ret, t) => {
    return { ...ret, [t.src]: t };
  }, {});
  const data = imgs.map((src) => ({
    width: 1920,
    height: 1080,
    originX: 0.5,
    originY: 0.5,
    clipTop: 0,
    clipRight: 0,
    clipBottom: 0,
    clipLeft: 0,
    ...taskMap[src],
    src,
    name: path.basename(src),
    http_src: `/static?path=${encodeURIComponent(src)}`,
  }));
  return json(data);
}

export default function Index() {
  const images = useLoaderData<(ImageVideoTask & { http_src: string; name: string; })[]>();
  const imgRef = useRef<HTMLImageElement>(null);

  // 跳转到下一张的时候自动保存任务
  const saveFetcher = useFetcher();
  const gotoNext = () => {
    saveFetcher.submit({
      ...img,
      width: imgRef.current?.naturalWidth,
      height: imgRef.current?.naturalHeight,
      originX,
      originY,
      clipTop,
      clipRight,
      clipBottom,
      clipLeft,
    } as any, {
      method: 'post',
    });
    setIndex(Math.min(index + 1, images.length - 1));
  };

  const [index, setIndex] = useState<number>(-1);
  const img = images[index] || images[0];
  useEffect(() => {
    const index = window.localStorage.getItem('index');
    if (index !== null) {
      setIndex(+index);
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
      window.localStorage.setItem('index', index as unknown as string);
    }
    window.addEventListener('keyup', onKeyPress);
    return () => {
      window.removeEventListener('keyup', onKeyPress);
    };
  }, [index]);

  const [originX, setOriginX] = useState(0);
  const [originY, setOriginY] = useState(0);
  const [clipTop, setClipTop] = useState('0.12');
  const [clipRight, setClipRight] = useState('0');
  const [clipBottom, setClipBottom] = useState('0');
  const [clipLeft, setClipLeft] = useState('0');
  const onImageClick = useCallback((e: React.MouseEvent<HTMLImageElement, MouseEvent>) => {
    e.preventDefault();
    const img = e.currentTarget;
    const box = img.getBoundingClientRect();
    const x = (e.clientX - box.left) / img.width;
    const y = (e.clientY - box.top) / img.height;
    setOriginX(x);
    setOriginY(y);
  }, []);
  useEffect(() => {
    setOriginX(img.originX);
    setOriginY(img.originY);
    setClipTop((img.clipTop || 0.12) as unknown as string);
    setClipRight(img.clipRight as unknown as string);
    setClipBottom(img.clipBottom as unknown as string);
    setClipLeft(img.clipLeft as unknown as string);
  }, [img]);

  const deleteFetcher = useFetcher();
  const deleteImage = () => {
    deleteFetcher.submit({ src: img.src }, { method: 'delete' });
  };

  return (
    <div className="p-10 text-center">
      <div className="space-x-4 uppercase">
        <label className="space-x-1">
          裁切：
          <input type="text" value={clipTop} onChange={(e) => setClipTop(e.target.value)} className="border w-10" />
          <input type="text" value={clipRight} onChange={(e) => setClipRight(e.target.value)} className="border w-10" />
          <input type="text" value={clipBottom} onChange={(e) => setClipBottom(e.target.value)} className="border w-10" />
          <input type="text" value={clipLeft} onChange={(e) => setClipLeft(e.target.value)} className="border w-10" />
        </label>
        <label className="space-x-1">
          index：
          <input type="text" value={index} onChange={(e) => setIndex(+e.target.value)} className="border w-10" />
          {' '} / {images.length}
        </label>
        <span>name: {img.name}</span>
        <span>x: {originX.toFixed(2)}</span>
        <span>y: {originY.toFixed(2)}</span>
        <span>state: {img.state || null}</span>
      </div>
      <div className="flex pt-10 justify-center">
        <div className="relative" style={{ width: 1000 }}>
          {/* <div className="bg-black absolute top-0 left-0 w-full opacity-50" style={{ height: `${+clipTop * 100}%` }}></div> */}
          <div className="bg-orange-400 absolute w-2 h-2 rounded -mt-1 -ml-1" style={{
            left: `${originX * 100}%`,
            top: `${originY * 100}%`,
          }}></div>
          <img
            ref={imgRef}
            className="max-w-full max-h-full select-none"
            style={{ minHeight: 200 }}
            src={img.http_src}
            onClick={onImageClick}
          />
        </div>
      </div>
      <div className="mt-4 space-x-4">
        <button className="btn-primary" onClick={() => setIndex(Math.max(index - 1, 0))}>上一个</button>
        <button className="btn-primary" onClick={deleteImage}>删除</button>
        <button className="btn-primary" onClick={gotoNext}>下一个</button>
      </div>
    </div>
  );
}
