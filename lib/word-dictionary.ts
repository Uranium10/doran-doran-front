export const WORD_POS = ["명사", "동사", "형용사", "부사"] as const
export type WordPos = typeof WORD_POS[number]
export type DictionaryWord = {
  word: string; pos: WordPos; grade: number; story_count: number; occurrence_count: number
  first_seen_at: string; last_seen_at: string; first_story_id: string; story_title: string
  example: string; surface: string; scene_index: number; text_offset: number; definitions: string[]
}
export type DictionaryPage = {
  profile_id: string; total: number; offset: number; limit: number; items: DictionaryWord[]
  summary: { total_words: number; new_this_week: number; by_pos: Partial<Record<WordPos, number>>
    completed_books: number; analyzed_books: number; pending_books: number }
}
export const dictionaryPath = (id: string) => `/parent/vocabulary?profile=${encodeURIComponent(id)}`
/** 동형어도 품사가 다르면 별도 항목이다. 구분자를 포함한 키로 React가 카드를 재사용하지 않게 한다. */
export const wordKey = (word: Pick<DictionaryWord, "word" | "pos">) => `${word.pos}:${word.word}`
export const dictionaryLastOffset = (total: number, limit = 24) => Math.max(0, Math.ceil(total / limit) - 1) * limit
