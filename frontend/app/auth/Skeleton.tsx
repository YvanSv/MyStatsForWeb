import { SkeletonDoubleFrame } from "../components/Atomic/DoubleFrame/DoubleFrame";

const SKELETON_STYLES = {
  PULSE: "animate-pulse bg-white/5 rounded-2xl h-12 w-full",
  TEXT_SM: "h-3 bg-white/5 rounded animate-pulse",
};

export function SkeletonAuth() {
  const contents = [
    <>
      <div className="h-14 w-full bg-vert/10 rounded-full animate-pulse" />
      
      <div className="relative py-4">
          <div className="w-full border-t border-white/5" />
      </div>

      <div className="space-y-6">
        {[1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <div className={`w-16 ml-2 ${SKELETON_STYLES.TEXT_SM}`} />
            <div className={SKELETON_STYLES.PULSE}/>
          </div>
        ))}
        <div className="h-14 w-full bg-white/10 rounded-2xl animate-pulse mt-4" />
      </div>
    </>,
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <div key={i} className="space-y-2">
          <div className={`w-24 ml-2 ${SKELETON_STYLES.TEXT_SM}`} />
          <div className={SKELETON_STYLES.PULSE}/>
        </div>
      ))}
      
      <div className="grid grid-cols-2 gap-4">
        {[1,2].map(i => (
          <div key={i} className="space-y-2">
            <div className={`w-20 ml-2 ${SKELETON_STYLES.TEXT_SM}`} />
            <div className={SKELETON_STYLES.PULSE}/>
          </div>
        ))}
      </div>

      <div className="h-14 w-full bg-vert/10 rounded-2xl animate-pulse mt-6" />
      <div className={`w-3/4 mx-auto mt-4 ${SKELETON_STYLES.TEXT_SM}`} />
    </div>
  ]
  return <SkeletonDoubleFrame contents={contents}/>;
}