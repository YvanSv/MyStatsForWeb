export function AvatarContainer({children,url,username,additional,title}:{children?:any,url:string|undefined,username?:string,additional?:string,title?:any}) {
    return (
        <div className={`flex flex-col md:flex-row items-end gap-6 ${additional}`}>
            <img src={url || undefined} className='w-40 h-40 rounded-[35px] border-4 border-bg1 bg-bg2 object-cover shadow-2xl' alt="Avatar"/>
            <div className="flex flex-1 flex-col gap-6 mb-5">
                {title}
                <h1 className='text1 text-[40px] font-semibold leading-none'>{username || '...'}</h1>
            </div>
            {children}
        </div>
    );
}