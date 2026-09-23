// 미리보기와 저장 그림이 같은 벡터를 공유한다. 네트워크 다운로드나 이미지 디코딩을 기다리지 않는다.
export const STICKERS={
  ribbon:{label:'리본',parts:[['M48 40Q12 5 7 31Q3 56 43 56L24 83L42 78L48 90L53 56L64 87L72 74L88 80L63 54Q99 57 93 31Q86 6 57 40Z','#e78a99'],['M44 38Q51 33 59 39L60 56Q52 61 44 55Z','#cc617d']]},
  sun:{label:'해',parts:[['M50 3L58 20L73 9L75 28L94 25L86 42L100 52L82 59L89 78L70 76L66 96L52 82L36 97L32 78L12 83L19 63L1 55L18 44L8 27L29 29L28 9L43 20Z','#f0b949'],['M75 51A25 25 0 1 1 25 51A25 25 0 1 1 75 51Z','#ffe29a'],['M38 45L38 49M62 45L62 49M43 61Q51 69 59 61','none']]},
  moon:{label:'달',parts:[['M67 7C4 1 2 94 65 94Q88 92 96 71C39 90 24 33 67 7Z','#efd29a'],['M56 66Q64 72 72 66','none']]},
  star:{label:'별',parts:[['M50 6L64 34L96 39L73 61L79 94L50 78L20 94L26 61L3 39L36 34Z','#f5c76b'],['M40 48L40 51M60 48L60 51M44 62Q51 67 58 61','none']]},
  heart:{label:'하트',parts:[['M50 88C-16 48 5 2 35 14Q46 18 50 30Q55 15 69 13C105 7 116 49 50 88Z','#ef9c9c']]},
  cloud:{label:'구름',parts:[['M20 78C-3 73 1 45 22 42C18 12 61 4 68 36C95 20 111 66 88 77Z','#dceaf2']]},
  flower:{label:'꽃',parts:[['M50 50Q28 43 31 20Q44 1 56 25Q68 4 84 18Q93 37 70 48Q95 49 91 70Q79 88 62 68Q64 94 43 97Q21 89 34 67Q10 82 6 60Q7 42 32 48Z','#dfb2ce'],['M64 52A14 14 0 1 1 36 52A14 14 0 1 1 64 52Z','#f5d584']]},
  leaf:{label:'나뭇잎',parts:[['M14 86C-8 37 34 5 87 9C98 65 61 101 14 86Z','#9dbf8f'],['M9 93L69 29M29 71L24 45M45 55L71 59','none']]},
} as const
export type StickerKind=keyof typeof STICKERS
export function paintSticker(ctx:CanvasRenderingContext2D,kind:StickerKind){
  ctx.lineJoin='round';ctx.lineCap='round';ctx.lineWidth=2.5;ctx.strokeStyle='#715a42'
  for(const [path,color] of STICKERS[kind].parts){const shape=new Path2D(path);if(color!=='none'){ctx.fillStyle=color;ctx.fill(shape)}ctx.stroke(shape)}
}
