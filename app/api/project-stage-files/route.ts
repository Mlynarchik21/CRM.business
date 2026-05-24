import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function slugifyFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "Файлы не переданы." }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "project-stage-files");
  await mkdir(uploadDir, { recursive: true });

  const uploadedFiles = [];

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Файл "${file.name}" больше 10 МБ.` },
        { status: 400 },
      );
    }

    const extension = path.extname(file.name);
    const fileBaseName = path.basename(file.name, extension);
    const safeBaseName = slugifyFileName(fileBaseName) || "file";
    const generatedName = `${Date.now()}-${crypto.randomUUID()}-${safeBaseName}${extension}`;
    const targetPath = path.join(uploadDir, generatedName);
    const buffer = Buffer.from(await file.arrayBuffer());

    await writeFile(targetPath, buffer);

    uploadedFiles.push({
      id: crypto.randomUUID(),
      name: file.name,
      url: `/uploads/project-stage-files/${generatedName}`,
      size: file.size,
      type: file.type || "application/octet-stream",
    });
  }

  return NextResponse.json({ files: uploadedFiles });
}
