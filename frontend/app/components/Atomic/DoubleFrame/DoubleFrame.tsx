const STYLE = {
  WRAPPER: "min-h-[85vh] flex items-center justify-center px-4 py-12 md:py-20",
  CARD: "w-full max-w-6xl bg-bg2/40 backdrop-blur-2xl border border-white/5 rounded-[40px] shadow-2xl overflow-hidden",
  CONTAINER_FLEX: "flex flex-col lg:flex-row",
  COL_LEFT: "flex-1 p-8 md:p-12 lg:p-16",
  COL_RIGHT: "flex-1 p-8 md:p-12 lg:p-16 bg-white/[0.02] flex flex-col",
  HEADER_SECTION: "mb-5 lg:mb-10",
  TITLE: `text1 font-semibold mb-3 text-[16px] md:text-[24px]`,
  SUBTITLE: `text3 text-md tracking-[0.2em] font-medium`,
  SEPARATOR: "hidden lg:flex flex-col items-center justify-center",
  SEPARATOR_LINE: "w-[1px] h-3/4 bg-gradient-to-b from-transparent via-white/10 to-transparent",
}

export function DoubleFrame({icons,titles,subtitles,contents}:any) {
  return (
    <div className={STYLE.WRAPPER}>
      <div className={STYLE.CARD}>
        <div className={STYLE.CONTAINER_FLEX}>
          <div className={STYLE.COL_LEFT}>
            <ContentDF icon={icons && icons[0]} title={titles[0]} subtitle={subtitles[0]} content={contents[0]}/>
          </div>

          <div className={STYLE.SEPARATOR}>
            <div className={STYLE.SEPARATOR_LINE}/>
          </div>

          <div className={STYLE.COL_RIGHT}>
            <ContentDF icon={icons && icons[1]} title={titles[1]} subtitle={subtitles[1]} content={contents[1]}/>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContentDF({icon,title,subtitle,content}:any) {
  return (
    <>
      <div className={STYLE.HEADER_SECTION}>
        {icon}
        <p className={STYLE.TITLE}>{title}</p>
        <p className={STYLE.SUBTITLE}>{subtitle}</p>
      </div>
      {content}
    </>
  );
}

export function SkeletonDoubleFrame({contents}:any) {
  return (
    <div className={STYLE.WRAPPER}>
      <div className={STYLE.CARD}>
        <div className={STYLE.CONTAINER_FLEX}>
          <div className={STYLE.COL_LEFT}>
            <SkeletonContentDF content={contents[0]}/>
          </div>

          <div className={STYLE.SEPARATOR}>
            <div className={STYLE.SEPARATOR_LINE}/>
          </div>

          <div className={STYLE.COL_RIGHT}>
            <SkeletonContentDF content={contents[1]}/>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonContentDF({content}:any) {
  return (
    <>
      <div className={STYLE.HEADER_SECTION}>
        <div className="space-y-3">
          <div className="h-10 w-32 bg-white/10 rounded-xl animate-pulse" />
          <div className="h-4 w-48 bg-white/5 rounded-lg animate-pulse" />
        </div>
      </div>
      {content}
    </>
  );
}