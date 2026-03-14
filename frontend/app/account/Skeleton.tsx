import { SkeletonDoubleFrame } from "../components/Atomic/DoubleFrame/DoubleFrame";

export function Skeleton() {
  const contents = [
    <div className="space-y-6">
      {[1,2].map(i => (
        <div key={i} className="space-y-1">
          <div className={`h-12 w-full animate-pulse bg-white/5 rounded-2xl`}/>
        </div>
      ))}
      <div className="h-14 w-full bg-white/10 rounded-2xl animate-pulse mt-4"/>
    </div>,
    <>
      <div className="h-48 w-full bg-white/5 rounded-[30px] border border-white/5 animate-pulse"/>
      {/* Note en bas */}
      <div className="mt-8 space-y-2">
        <div className="h-2 w-full bg-white/5 rounded animate-pulse"/>
        <div className="h-2 w-2/3 mx-auto bg-white/5 rounded animate-pulse"/>
      </div>
    </>
  ]
  return <SkeletonDoubleFrame contents={contents}/>;
}