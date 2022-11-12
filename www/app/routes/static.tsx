import { LoaderFunction } from "@remix-run/node";
import { createReadStream } from "~/utils/fs.server";

export let loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const path = decodeURIComponent(url.searchParams.get('path') || '');
  let stream = createReadStream(path);
  let body: Buffer = await new Promise((resolve, reject) => {
    let buffers: Uint8Array[] = [];
    stream.on("data", (data) => {
      buffers.push(data as any);
    });
    stream.on("end", () => {
      resolve(Buffer.concat(buffers));
    });
    stream.on("error", reject);
  });
  let headers = new Headers({ "Content-Type": "image/png" });
  return new Response(body, { status: 200, headers });
}