export function AvatarContainer({children,url,username,additional}:{children?:any,url:string|undefined,username?:string,additional?:string}) {
    return (
        <div className={`flex flex-col md:flex-row items-end gap-6 ${additional}`}>
            <img src={url || undefined} className='w-40 h-40 rounded-[35px] border-4 border-bg1 bg-bg2 object-cover shadow-2xl' alt="Avatar"/>
            <div className='flex-1 mb-4'>
                <h1 className='text1 text-[40px] font-semibold leading-none mb-2'>{username}</h1>
                <p className='text2 tracking-[0.2em] text-sm uppercase'>Membre Premium</p>
            </div>
            {children}
        </div>
    );
}