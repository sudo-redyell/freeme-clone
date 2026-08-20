import { NextRequest, NextResponse } from "next/server";
import { Defuddle } from "defuddle/node";

export async function POST(request: NextRequest) {
  let url = "";
  try {
    const body = await request.json();
    if (typeof body?.url === "string") url = body.url.trim();
  } catch {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.json(
      { error: "http(s):// 로 시작하는 URL을 입력해주세요." },
      { status: 400 }
    );
  }

  let html: string;
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; FreeMeCloneBot/1.0; +https://freeme-clone.example)",
      },
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: "이 페이지에 접근할 수 없어요." },
        { status: 502 }
      );
    }
    html = await response.text();
  } catch {
    return NextResponse.json(
      { error: "이 페이지에 접근할 수 없어요." },
      { status: 502 }
    );
  }

  try {
    const result = await Defuddle(html, url, { markdown: true });
    if (!result.content?.trim()) {
      return NextResponse.json(
        { error: "본문을 추출하지 못했어요." },
        { status: 422 }
      );
    }
    return NextResponse.json({
      title: result.title || null,
      author: result.author || null,
      site: result.site || null,
      markdown: result.content,
    });
  } catch {
    return NextResponse.json(
      { error: "본문을 추출하지 못했어요." },
      { status: 422 }
    );
  }
}
