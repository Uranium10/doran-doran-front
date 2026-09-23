"use client"

import { useState } from "react"
import { FileDown, LoaderCircle } from "lucide-react"
import { toast } from "sonner"
import { downloadFile } from "@/lib/api"

export function PdfDownloadButton({path,filename,label="PDF 저장",className=""}:{path:string;filename:string;label?:string;className?:string}) {
  const [busy,setBusy]=useState(false)
  const save=async()=>{
    if(busy)return
    setBusy(true)
    try{await downloadFile(path,filename);toast.success("PDF를 기기에 저장했어요.")}
    catch(error){toast.error(error instanceof Error?error.message:"PDF를 저장하지 못했어요.")}
    finally{setBusy(false)}
  }
  return <button type="button" className={className} onClick={save} disabled={busy} aria-busy={busy}>
    {busy?<LoaderCircle size={17} className="animate-spin" aria-hidden="true"/>:<FileDown size={17} aria-hidden="true"/>}
    <span>{busy?"만드는 중…":label}</span>
  </button>
}
