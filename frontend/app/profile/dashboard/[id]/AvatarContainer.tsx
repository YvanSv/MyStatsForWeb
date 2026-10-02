export default function AvatarContainer({url,username,additional = "",title,special = false}:{url:string|undefined,username?:string,additional?:string,title?:any,special?:boolean}) {
  const isSpecial = special;
  const styleImg = `w-full h-full rounded-[26px] lg:rounded-[31px] bg-bg2 object-cover ${isSpecial ? '' : 'border-4 border-bg1'}`;

  return (
    <div className={`flex flex-row lg:items-end gap-4 lg:gap-6 ${additional}`}>
      <div className={`
        w-20 h-20 lg:w-40 lg:h-40 rounded-[30px] lg:rounded-[35px] shadow-2xl flex items-center justify-center
        ${isSpecial ? 'p-[4px] bg-gradient-to-tr from-red-500 via-purple-500 to-blue-500 animate-gradient-xy' : ''}
      `}><img src={url || undefined} className={styleImg} alt="Avatar"/></div>
      <div className="flex flex-1 flex-col gap-4 lg:gap-6 mb-5">{title}</div>
    </div>
  );
}
