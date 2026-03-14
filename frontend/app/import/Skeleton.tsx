import { SkeletonDoubleFrame } from "../components/Atomic/DoubleFrame/DoubleFrame";
import { BASE_UI } from "../styles/general";

const SKELETON_STYLES = {
  PULSE: `${BASE_UI.anim.base} animate-pulse bg-white/5 ${BASE_UI.rounded.input}`,
  TEXT_LG: `h-10 bg-white/10 ${BASE_UI.rounded.item} animate-pulse`,
  TEXT_MD: `h-4 bg-white/5 rounded-lg animate-pulse`,
  TEXT_SM: `h-3 bg-white/5 rounded animate-pulse`,
};

export function SkeletonImport() {
  const contents = [
    <div className="space-y-6">
      <div className="h-40 w-full border-2 border-dashed border-white/5 rounded-[30px] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 bg-white/5 rounded-full animate-pulse" />
        <div className={`w-40 ${SKELETON_STYLES.TEXT_SM}`} />
      </div>
      <div className="h-14 w-full bg-white/10 rounded-2xl animate-pulse" />
      <div className={`w-48 mx-auto ${SKELETON_STYLES.TEXT_SM}`} />
    </div>,
    <div className="space-y-6">
      {[1, 2, 3, 4].map((step) => (
        <div key={step} className="flex gap-4 items-start">
          <div className="w-8 h-8 shrink-0 bg-white/5 rounded-full animate-pulse" />
          <div className="space-y-2 w-full">
            <div className={`w-full ${SKELETON_STYLES.TEXT_MD}`} />
            <div className={`w-2/3 ${SKELETON_STYLES.TEXT_MD}`} />
          </div>
        </div>
      ))}

      {/* Note technique simulée */}
      <div className="mt-8 p-6 bg-white/5 rounded-[30px] space-y-3">
        <div className={`w-32 bg-white/10 ${SKELETON_STYLES.TEXT_SM}`} />
        <div className={`w-full ${SKELETON_STYLES.TEXT_SM}`} />
        <div className={`w-full ${SKELETON_STYLES.TEXT_SM}`} />
      </div>
    </div>
  ];
  return <SkeletonDoubleFrame contents={contents}/>;
}