import { ChevronDown, ExternalLink } from "lucide-react"

const sources = [
  {
    institution: "한국학중앙연구원",
    title: "한국민족문화대백과사전",
    description: "전래동화·설화의 줄거리와 문화적 배경",
    url: "https://encykorea.aks.ac.kr/",
    policyUrl: "https://www.aks.ac.kr/com/cmm/EgovContentView.do?menuNo=4010164000",
    terms: "텍스트는 공공누리 제1유형(출처 표시)입니다. 사진·미디어의 이용조건은 별도입니다.",
  },
  {
    institution: "국립민속박물관",
    title: "한국민속대백과사전",
    description: "한국민속문학사전 설화·판소리 자료 및 원천 자료 대조",
    url: "https://folkency.nfm.go.kr/kr/",
    policyUrl: "https://folkency.nfm.go.kr/kr/",
    terms: "현재 웹사이트의 텍스트 안내는 공공누리 제2유형(출처 표시·상업적 이용금지)입니다. 수집한 PDF와 학습용 자료의 개별 이용조건은 추가 확인 중입니다.",
  },
  {
    institution: "한국고전번역원",
    title: "한국고전종합DB",
    description: "고전문학 기초 자료",
    url: "https://db.itkc.or.kr/",
    policyUrl: "https://www.itkc.or.kr/content/contents.do?menuId=112",
    terms: "기관의 저작권 정책을 따릅니다. 사용 자료별 이용조건과 별도 허락 범위를 확인 중입니다.",
  },
  {
    institution: "한국학중앙연구원",
    title: "한국구비문학대계",
    description: "설화의 판본 비교와 일부 이야기의 전개 보완",
    url: "https://kdp.aks.ac.kr/inde/gubi",
    policyUrl: "https://kdp.aks.ac.kr/inde/gubi?id=POKS.GUBI.GUBI.1_0104_0535",
    policyLabel: "참고한 채록본",
    terms: "채록 자료의 개별 이용조건은 확인 중입니다. 한국민족문화대백과사전과는 별도 자료입니다.",
  },
  {
    institution: "국립국어원",
    title: "국어 기초 어휘 선정 및 어휘 등급화 연구",
    description: "어휘 등급 자료와 읽기 난이도 설계의 참고 연구",
    url: "https://korean.go.kr/front/reportData/reportDataView.do?report_seq=1160",
    policyUrl: "https://korean.go.kr/front/reportData/reportDataView.do?report_seq=1160",
    terms: "2023년 연구의 어휘 목록 엑셀은 공공누리 제1유형, 연구보고서는 제4유형입니다. 서비스에서 가공한 어휘 자료의 원본 버전은 대조 중입니다.",
  },
]

const linkStyle = "rounded-sm underline decoration-border underline-offset-4 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"

// 출처 공개와 이용허락을 구분하고, 확인되지 않은 자료를 일괄 1유형으로 표시하지 않는다.
export function LandingDataSources() {
  return (
    <section aria-labelledby="data-sources-heading" className="mt-10 border-t border-border pt-7 text-sm">
      <h2 id="data-sources-heading" className="font-medium text-foreground">이야기의 바탕이 된 자료</h2>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        도란도란은 아래 자료를 바탕으로 이야기를 정리·각색하고, 어휘와 읽기 난이도를 설계합니다.
      </p>
      <ul className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        {sources.map((source) => (
          <li key={source.title} className="min-w-0">
            <p className="mb-1 text-xs text-muted-foreground">{source.institution}</p>
            <a href={source.url} target="_blank" rel="noopener noreferrer" className={`${linkStyle} inline-flex items-start gap-1.5 leading-relaxed`}>
              <span>{source.title}</span>
              <ExternalLink aria-hidden="true" className="mt-1 h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="sr-only">(새 창)</span>
            </a>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{source.description}</p>
          </li>
        ))}
      </ul>
      <details className="group mt-6 border-t border-border pt-1 text-muted-foreground">
        <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 rounded-sm text-xs hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
          자료별 출처 및 이용조건 안내
          <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
        </summary>
        <div className="max-w-4xl pb-2 text-xs leading-6">
          <p>출처 표기가 모든 자료의 상업적 이용이나 변경 허락을 뜻하지는 않습니다. 자료마다 적용되는 이용조건이 다릅니다.</p>
          <dl className="mt-4 space-y-3">
            {sources.map((source) => (
              <div key={source.title}>
                <dt className="font-medium text-foreground">{source.title}</dt>
                <dd>
                  {source.terms}{" "}
                  <a href={source.policyUrl} target="_blank" rel="noopener noreferrer" className={linkStyle}>
                    {source.policyLabel ?? "공식 이용안내"}<span className="sr-only">(새 창)</span>
                  </a>
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4">생성된 동화는 원자료를 참고한 각색·창작물이며, 원문 그대로의 재현이나 자료 제공기관의 공식 견해를 뜻하지 않습니다.</p>
          <p className="mt-2">안내 확인일: <time dateTime="2026-09-30">2026년 9월 30일</time></p>
        </div>
      </details>
    </section>
  )
}
