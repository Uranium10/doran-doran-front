"use client"
import Link from "next/link"
import { ArrowRight, BookOpen, Sparkles, RotateCcw, Star } from "lucide-react"
import { getStageInfo, getTierProgress } from "@/lib/levels"
import { bookPath, type Bookshelf } from "@/lib/bookshelf"
import { BookCover } from "./book-cover"
import styles from "./dashboard-summary.module.css"

/** 씨앗→새싹→나무→숲을 작은 삽화로 그린다. SVG이므로 해상도와 다운로드 비용에 독립적이다. */
function TierArtwork({name}:{name:string}) {
  return <svg viewBox="0 0 110 74" className={styles.tierArt} role="img" aria-label={`${name} 티어 그림`}>
    <ellipse cx="55" cy="65" rx="31" ry="5" fill="#dfd6b9"/>
    {name==='씨앗'?<><path d="M57 20C83 26 81 62 56 65C32 60 30 29 57 20" fill="#b48051"/><path d="M58 23Q44 43 57 62" fill="none" stroke="#edca95" strokeWidth="3"/><path d="M58 21Q58 8 72 12Q71 23 58 21" fill="#86a577"/></>
      : name==='새싹'?<><path d="M54 64Q59 44 54 26" fill="none" stroke="#70895e" strokeWidth="5" strokeLinecap="round"/><path d="M55 42Q23 42 28 20Q54 18 55 42" fill="#a5b986"/><path d="M56 31Q58 9 84 13Q87 36 56 39" fill="#6f9b77"/></>
      : <>{name==='숲'&&<><path d="M23 60V38M86 62V35" stroke="#9b7a52" strokeWidth="6"/><path d="M22 6L6 43H39Z" fill="#90aa8b"/><path d="M85 3L69 42H102Z" fill="#91ad79"/></>}<path d="M54 64V32" stroke="#916b46" strokeWidth="9" strokeLinecap="round"/><path d="M56 41L42 30M55 47L68 33" stroke="#916b46" strokeWidth="4"/><path d="M32 34C11 8 53 -3 59 13C86 -1 100 32 76 39C70 55 39 50 32 34" fill={name==='숲'?'#49785e':'#739a69'}/><circle cx="43" cy="22" r="5" fill="#c9d9a0" opacity=".6"/></>}
  </svg>
}

export function DashboardSummary({profile,data}:{profile:{name:string;level:number|null};data?:Bookshelf}) {
  const progress=getTierProgress(profile.level),stage=getStageInfo(profile.level)
  const percent=progress?.achievement??0
  return <>
    <header className={styles.welcome}>
      <div><p>{profile.name}의 작은 책방</p><h1>오늘도, 이야기 속으로!</h1></div>
      <span className={styles.welcomeNote}><Star size={15} fill="currentColor"/>한 장씩 자라는 상상력</span>
    </header>
    <section className={styles.cards} aria-label="나의 읽기 여정">
      <div className={`${styles.card} ${styles.progress}`}>
        <p className={styles.eyebrow}>나의 읽기 나무</p><h2 className={styles.title}>조금씩, 쑥쑥 자라요</h2>
        <div className={styles.badgeStage}>
          <span className={styles.littleStar} aria-hidden="true">✦</span><span className={styles.littleDot} aria-hidden="true"/>
          <div className={styles.tier} role="progressbar" aria-label="다음 읽기 단계까지 진척도" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
            <svg className={styles.ring} viewBox="0 0 210 210" aria-hidden="true"><circle cx="105" cy="105" r="96" fill="none" stroke="#e3e9cc" strokeWidth="11"/><circle cx="105" cy="105" r="96" pathLength="100" fill="none" stroke="#3c8061" strokeWidth="11" strokeLinecap="round" strokeDasharray={`${percent} 100`} transform="rotate(-90 105 105)" opacity={percent>0?1:0}/></svg>
            <div className={styles.tierInside}><TierArtwork name={stage?.name??'씨앗'}/><strong>{progress?.currentLabel??'단계 알아보기'}</strong><span>{progress?<>{percent}<small>%</small></>:'측정 전'}</span></div>
          </div>
          <span className={styles.growthTag}>{progress?'잘 자라고 있어요!':'첫 모험을 준비해요'}</span>
        </div>
        <p className={styles.next}>{progress?.nextLabel?<>다음은 <strong>{progress.nextLabel}</strong></>:progress?'가장 울창한 숲에 도착했어요':'나에게 맞는 읽기 단계를 찾아요'}</p>
        <div className={styles.measureWrap}>{data?.measured_today?<><button type="button" aria-disabled="true" aria-describedby="daily-measure-tip" className={styles.measureButton}><RotateCcw size={15}/>문해력 재측정</button><span id="daily-measure-tip" role="tooltip" className={styles.measureTip}>문해력 재측정은<br/>하루 한 번 할 수 있어요</span></>:<Link href="/literacy" className={styles.measureButton}><RotateCcw size={15}/>{progress?'문해력 재측정':'읽기 단계 알아보기'}</Link>}</div>
        {data?.latest_result?<Link className={styles.latest} href={`/results/${data.latest_result.id}?from=dashboard`}>마지막으로 푼 문제 보기 <ArrowRight size={12}/></Link>:<span className={styles.latest}>첫 문제 기록을 기다려요</span>}
      </div>
      <div className={`${styles.card} ${styles.adventure}`}>
        <p className={styles.eyebrow}>책갈피가 기다리고 있어요</p><h2 className={styles.title}>모험 계속하기</h2>
        <div className={styles.bookStage}>
          <span className={styles.sunshine} aria-hidden="true">✳</span><span className={styles.cloud} aria-hidden="true"/>
          {data?.resume?<Link className={styles.miniBook} href={bookPath(data.resume.story_id,'dashboard')} aria-label={`${data.resume.title} 이어 읽기`}><BookCover book={{...data.resume,reading_status:"reading"}} compact/></Link>
          :<div className={styles.noAdventure}><BookOpen size={70} strokeWidth={1.5}/><Sparkles size={25}/></div>}
          <span className={styles.bookmark} aria-hidden="true"/>
        </div>
        <p className={styles.bookTitle}>{data?.resume?data.resume.title:<>우리의 첫 모험을<br/>만나러 갈까요?</>}</p>
        <p className={styles.storyNote}>{data?.resume?'이야기는 여기서부터 다시 시작!':'책장에 새로운 이야기가 기다려요'}</p>
        <Link href={data?.resume?bookPath(data.resume.story_id,'dashboard'):'/library'} className={styles.continue}>{data?.resume?'이어서 읽기':'책장 둘러보기'}<span><ArrowRight size={19}/></span></Link>
      </div>
      {/* 이 영역 전체가 책 표지다. 안쪽에 작은 카드를 중첩하지 않고 책등·속지로 진입점을 구분한다. */}
      <Link href="/stickers" className={`${styles.card} ${styles.stickerCard}`} aria-label="나의 스티커북 열기">
        <span className={styles.bookSpine} aria-hidden="true"/>
        <span className={styles.albumSmall}>도란도란 · 모험 수집</span>
        <h2 className={styles.albumTitle}>나의 스티커북</h2>
        <div className={styles.albumPicture}><img src="/images/stickers/reading-friends.webp" alt="" width="480" height="480"/><span className={styles.seal} aria-hidden="true"><Star size={15} fill="currentColor"/>우리만의<br/>보물</span></div>
        <p className={styles.stickerNote}>이야기 속 친구들이<br/>내게 남긴 작은 선물</p>
        <span className={styles.openAlbum}>펼쳐 보기 <ArrowRight size={18}/></span>
        <span className={styles.albumFoot} aria-hidden="true">✦　소중한 마음을 한 장씩　✦</span>
      </Link>
    </section>
  </>
}
