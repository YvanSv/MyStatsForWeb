import type { ReactNode } from "react";
import { useLanguage } from "@/app/context/languageContext";

export function AvatarContainer({children,url,username,additional='',title,special=false}:{children?:ReactNode,url:string|undefined,username?:string,additional?:string,title?:ReactNode,special?:boolean}) {
  const { t } = useLanguage();
  // `special` vient du serveur (profil.is_special) : le style ne dépend jamais du pseudo choisi
  const isSpecial = special;
  const styleImg = `w-full h-full rounded-[31px] bg-bg2 object-cover ${isSpecial ? '' : 'border-4 border-bg1'}`;

  return (
    <div className={`flex flex-col md:flex-row items-end gap-6 ${additional}`}>
      <div className={`
        w-40 h-40 rounded-[35px] shadow-2xl flex items-center justify-center
        ${isSpecial ? 'p-[4px] bg-gradient-to-tr from-red-500 via-purple-500 to-blue-500 animate-gradient-xy' : ''}
      `}>
        <img src={url || undefined} className={styleImg} alt={t.a11y.avatar}/>
      </div>
      <div className="flex flex-1 flex-col gap-6 mb-5">
        {title}
        <h1 className='text1 text-[40px] font-semibold leading-none'>{username || '...'}</h1>
      </div>
      {children}
    </div>
    
  );
}