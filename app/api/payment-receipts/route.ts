import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

const MAX_FILE_SIZE = 15 * 1024 * 1024;

function slugifyFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Файл чека не передан." }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `Файл "${file.name}" больше 15 МБ.` },
      { status: 400 },
    );
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "payment-receipts");
  await mkdir(uploadDir, { recursive: true });

  const extension = path.extname(file.name);
  const fileBaseName = path.basename(file.name, extension);
  const safeBaseName = slugifyFileName(fileBaseName) || "receipt";
  const generatedName = `${Date.now()}-${crypto.randomUUID()}-${safeBaseName}${extension}`;
  const targetPath = path.join(uploadDir, generatedName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(targetPath, buffer);

  return NextResponse.json({
    file: {
      name: file.name,
      url: `/uploads/payment-receipts/${generatedName}`,
      size: file.size,
      type: file.type || "application/octet-stream",
    },
  });
}
