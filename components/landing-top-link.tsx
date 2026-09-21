"use client"

import Link from "next/link"
import type { ComponentProps } from "react"

/** 같은 /#hero 주소를 다시 눌러도 최상단 이동을 생략하지 않는다. */
export function LandingTopLink({ onClick, ...props }: Omit<ComponentProps<typeof Link>, "href">) {
  return (
    <Link
      {...props}
      href="/#hero"
      onClick={(event) => {
        onClick?.(event)
        // 새 탭 열기·다른 페이지에서의 이동은 링크의 기본 동작을 유지한다.
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey
          || event.shiftKey || event.altKey || (event.currentTarget.target && event.currentTarget.target !== "_self")
          || window.location.pathname !== "/") return

        event.preventDefault()
        // Next의 같은 해시 이동 생략을 피하고, 모바일 메뉴를 닫은 뒤에도 창 기준으로 이동한다.
        // 기존 history state를 보존해 Next의 뒤로가기 정보가 유실되지 않게 한다.
        window.history.replaceState(window.history.state, "", "#hero")
        window.scrollTo({ top: 0, left: 0,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })
      }}
    />
  )
}
