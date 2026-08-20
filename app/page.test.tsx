import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import Home from "@/app/page";

test("초기 화면은 URL 입력창과 변환하기 버튼, 빈 상태 안내를 보여준다", () => {
  render(<Home />);

  expect(
    screen.getByRole("textbox", { name: "변환할 페이지 URL" })
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "변환하기" })
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      "블로그 글이나 뉴스 기사의 URL을 붙여넣고 변환하기를 눌러보세요."
    )
  ).toBeInTheDocument();
});
