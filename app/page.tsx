"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertCircle,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Moon,
  Sun,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Status = "idle" | "converting" | "result" | "error";

type ConvertResult = {
  title: string | null;
  author: string | null;
  site: string | null;
  markdown: string;
  sourceUrl: string;
};

const PROMPT_PRESETS = [
  { value: "요약해줘", label: "요약해줘" },
  { value: "한국어로 번역해줘", label: "한국어로 번역해줘" },
  { value: "쉽게 설명해줘", label: "쉽게 설명해줘" },
];

function slugify(title: string) {
  const cleaned = title
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return cleaned || "converted";
}

function subscribeNever() {
  return () => {};
}

function getPersistedDark() {
  try {
    return localStorage.getItem("freeme-dark") === "1";
  } catch {
    return false;
  }
}

function getServerDark() {
  return false;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ConvertResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const [promptChoice, setPromptChoice] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");

  const persistedDark = useSyncExternalStore(
    subscribeNever,
    getPersistedDark,
    getServerDark
  );
  const [darkOverride, setDarkOverride] = useState<boolean | null>(null);
  const dark = darkOverride ?? persistedDark;

  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  function toggleDark() {
    const next = !dark;
    setDarkOverride(next);
    try {
      localStorage.setItem("freeme-dark", next ? "1" : "0");
    } catch {
      // 저장하지 못해도 화면 전환 자체는 계속 동작한다
    }
  }

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  }

  async function handleConvert() {
    setUrlError("");
    const trimmed = url.trim();
    if (!trimmed) {
      setUrlError("URL을 입력해주세요.");
      return;
    }
    if (!/^https?:\/\//i.test(trimmed)) {
      setUrlError("http(s):// 로 시작하는 URL을 입력해주세요.");
      return;
    }

    setStatus("converting");
    try {
      const response = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error || "변환에 실패했어요.");
        setStatus("error");
        return;
      }
      setResult({
        title: data.title,
        author: data.author,
        site: data.site,
        markdown: data.markdown,
        sourceUrl: trimmed,
      });
      setStatus("result");
    } catch {
      setErrorMessage("변환에 실패했어요. 네트워크 상태를 확인해주세요.");
      setStatus("error");
    }
  }

  function handleClear() {
    setUrl("");
    setUrlError("");
    setStatus("idle");
    setResult(null);
    setErrorMessage("");
    setPromptChoice(null);
    setCustomPrompt("");
  }

  function currentPromptText() {
    if (promptChoice === "직접 입력") return customPrompt.trim();
    return promptChoice ?? "";
  }

  async function safeCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 클립보드를 쓸 수 없어도 새 탭 열기 등 나머지 동작은 계속 진행한다
    }
  }

  async function handleCopy() {
    if (!result) return;
    await safeCopy(result.markdown);
    showToast("마크다운을 복사했어요");
  }

  function handleDownload() {
    if (!result) return;
    const blob = new Blob([result.markdown], {
      type: "text/markdown;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${slugify(result.title || "converted")}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    showToast(".md 파일을 다운로드했어요");
  }

  async function handleOpenWithLLM(target: "chatgpt" | "claude") {
    if (!result) return;
    const prompt = currentPromptText();
    const payload = prompt ? `${prompt}\n\n${result.markdown}` : result.markdown;
    await safeCopy(payload);
    const destinationUrl =
      target === "chatgpt" ? "https://chatgpt.com/" : "https://claude.ai/new";
    window.open(destinationUrl, "_blank", "noopener");
    showToast(
      `클립보드에 복사했어요 · ${
        target === "chatgpt" ? "ChatGPT" : "Claude"
      }에 Ctrl/Cmd+V로 붙여넣어주세요`
    );
  }

  return (
    <div className="flex min-h-full flex-1 justify-center bg-background px-4 py-10 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-5">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="size-2 rounded-full bg-primary" aria-hidden />
            URL 마크다운 변환기
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="다크 모드 전환"
            onClick={toggleDark}
          >
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </header>

        <div className="flex flex-col gap-1.5">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (urlError) setUrlError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConvert();
              }}
              placeholder="https://example.com/blog/nextjs-16"
              aria-label="변환할 페이지 URL"
              disabled={status === "converting"}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleConvert}
                disabled={status === "converting"}
              >
                변환하기
              </Button>
              <Button type="button" variant="outline" onClick={handleClear}>
                지우기
              </Button>
            </div>
          </div>
          {urlError && <p className="text-sm text-destructive">{urlError}</p>}
        </div>

        {status === "idle" && (
          <div className="flex flex-col items-center gap-2 rounded-lg border bg-card p-10 text-center text-muted-foreground">
            <FileText className="size-7 opacity-50" aria-hidden />
            <p className="text-sm">
              블로그 글이나 뉴스 기사의 URL을 붙여넣고 변환하기를 눌러보세요.
            </p>
          </div>
        )}

        {status === "converting" && (
          <div className="flex flex-col gap-3 rounded-lg border bg-card p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              변환하는 중이에요…
            </div>
            <div className="flex flex-col gap-2" aria-hidden>
              <div className="h-4 w-2/5 animate-pulse rounded bg-muted" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
              <div className="h-3 w-full animate-pulse rounded bg-muted" />
              <div className="h-3 w-3/5 animate-pulse rounded bg-muted" />
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <AlertCircle
              className="mt-0.5 size-5 shrink-0 text-destructive"
              aria-hidden
            />
            <div className="flex flex-col gap-3">
              <div>
                <h2 className="text-sm font-semibold text-destructive">
                  변환에 실패했어요
                </h2>
                <p className="mt-1 text-sm">{errorMessage}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-fit"
                onClick={handleConvert}
              >
                다시 시도
              </Button>
            </div>
          </div>
        )}

        {status === "result" && result && (
          <div className="flex flex-col gap-5">
            <div className="rounded-lg border bg-card p-5">
              <h1 className="text-xl font-semibold">
                {result.title || "제목을 확인할 수 없어요"}
              </h1>
              {(result.author || result.site) && (
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {[result.author, result.site].filter(Boolean).join(" · ")}
                </p>
              )}
              <a
                href={result.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="size-3" aria-hidden />
                {result.sourceUrl.replace(/^https?:\/\//, "")}
              </a>
              <hr className="my-4 border-border" />
              <div
                className="max-h-[420px] overflow-y-auto pr-1 text-[15px] leading-7
                  [&_blockquote]:my-0 [&_blockquote]:mb-3.5 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3.5 [&_blockquote]:italic [&_blockquote]:text-muted-foreground
                  [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.9em]
                  [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-[17px] [&_h2]:font-semibold [&_h2:first-child]:mt-0
                  [&_li]:mb-1 [&_ol]:mb-3.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3.5 [&_ul]:mb-3.5 [&_ul]:list-disc [&_ul]:pl-5"
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {result.markdown}
                </ReactMarkdown>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-lg border bg-card p-5">
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground">
                  프롬프트
                </p>
                <Select
                  value={promptChoice}
                  onValueChange={(value) => setPromptChoice(value)}
                >
                  <SelectTrigger
                    className="w-full sm:w-auto"
                    aria-label="프롬프트 선택"
                  >
                    <SelectValue placeholder="없음" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROMPT_PRESETS.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="직접 입력">직접 입력</SelectItem>
                  </SelectContent>
                </Select>
                {promptChoice === "직접 입력" && (
                  <div className="flex flex-col gap-1">
                    <Textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="예: 이 글의 핵심 주장에 반박하는 댓글을 써줘"
                    />
                    <p className="text-xs text-muted-foreground">
                      저장되지 않아요 · 이번 내보내기에만 한 번 사용돼요.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground">
                  내보내기
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={handleCopy}>
                    <Copy className="size-3.5" aria-hidden />
                    복사하기
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDownload}
                  >
                    <Download className="size-3.5" aria-hidden />
                    .md 다운로드
                  </Button>
                  <Select
                    value={null}
                    onValueChange={(value) => {
                      if (value === "chatgpt" || value === "claude") {
                        handleOpenWithLLM(value);
                      }
                    }}
                  >
                    <SelectTrigger aria-label="ChatGPT 또는 Claude로 열기">
                      <SelectValue placeholder="ChatGPT · Claude로 열기" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chatgpt">ChatGPT로 열기</SelectItem>
                      <SelectItem value="claude">Claude로 열기</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-4 py-2.5 text-sm text-background shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
