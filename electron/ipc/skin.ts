import { app, dialog, ipcMain } from 'electron';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export function registerSkinHandlers(): void {
  ipcMain.handle('skin:pickAndRead', async (): Promise<Uint8Array | null> => {
    const result = await dialog.showOpenDialog({
      title: 'Import Minecraft skin',
      properties: ['openFile'],
      filters: [{ name: 'PNG image', extensions: ['png'] }],
    });

    if (result.canceled || !result.filePaths[0]) return null;
    return new Uint8Array(await readFile(result.filePaths[0]));
  });

  ipcMain.handle(
    'skin:download',
    async (_event, payload: { bytes: Uint8Array; suggestedName: string }): Promise<string | null> => {
      const safeName = path.basename(payload.suggestedName || 'my_skin').replace(/[^a-zA-Z0-9_-]/g, '_');
      const result = await dialog.showSaveDialog({
        title: 'Export Minecraft skin',
        defaultPath: path.join(app.getPath('downloads'), `${safeName}.png`),
        buttonLabel: 'Save skin',
        filters: [{ name: 'PNG image', extensions: ['png'] }],
      });

      if (result.canceled || !result.filePath) return null;
      await writeFile(result.filePath, Buffer.from(payload.bytes));
      return result.filePath;
    },
  );

  ipcMain.handle('skin:readFile', async (_event, absPath: string) => {
    try {
      return { ok: true as const, data: new Uint8Array(await readFile(absPath)) };
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : 'Could not read skin file.' };
    }
  });

  ipcMain.handle('skin:writeFile', async (_event, payload: { absPath: string; bytes: Uint8Array }) => {
    try {
      await writeFile(payload.absPath, Buffer.from(payload.bytes));
      return { ok: true as const, data: undefined };
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : 'Could not write skin file.' };
    }
  });

  ipcMain.handle('skin:blank', async (): Promise<Uint8Array> => {
    const width = 64;
    const height = 64;

    const zlib = await import('node:zlib');

    const signature = Buffer.from([
      0x89, 0x50, 0x4e, 0x47,
      0x0d, 0x0a, 0x1a, 0x0a,
    ]);

    const ihdrData = Buffer.alloc(13);

    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);

    ihdrData.writeUInt8(8, 8);  // Bit depth
    ihdrData.writeUInt8(6, 9);  // RGBA
    ihdrData.writeUInt8(0, 10); // Compression
    ihdrData.writeUInt8(0, 11); // Filter
    ihdrData.writeUInt8(0, 12); // Interlace

    const ihdr = makeChunk('IHDR', ihdrData);

    // Completely transparent RGBA image.
    const rowLength = 1 + width * 4;
    const raw = Buffer.alloc(rowLength * height);

    for (let y = 0; y < height; y++) {
      raw[y * rowLength] = 0;
    }

    const compressed = zlib.deflateSync(raw);

    const idat = makeChunk('IDAT', compressed);
    const iend = makeChunk('IEND', Buffer.alloc(0));

    return new Uint8Array(
      Buffer.concat([
        signature,
        ihdr,
        idat,
        iend,
      ])
    );
  });
}

function makeChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, 'ascii');

  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const crc = Buffer.alloc(4);

  crc.writeUInt32BE(
    crc32(Buffer.concat([typeBuffer, data])) >>> 0,
    0
  );

  return Buffer.concat([
    length,
    typeBuffer,
    data,
    crc,
  ]);
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;

  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i];

    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (
        0xedb88320 & -(crc & 1)
      );
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}