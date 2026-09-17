import { ResultPage } from "@/components/result-page"
export default async function Page({params,searchParams}:{params:Promise<{resultId:string}>;searchParams:Promise<{from?:string}>}) {
  const {resultId}=await params;const {from}=await searchParams
  return <ResultPage resultId={resultId} from={from??'dashboard'}/>
}
