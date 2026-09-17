import { BookReaderPage } from "@/components/book-reader-page"
export default async function Page({params,searchParams}:{params:Promise<{storyId:string}>;searchParams:Promise<{from?:string;view?:string}>}) {
  const {storyId}=await params;const query=await searchParams
  return <BookReaderPage storyId={storyId} from={query.from??'dashboard'} view={query.view??'book'}/>
}
