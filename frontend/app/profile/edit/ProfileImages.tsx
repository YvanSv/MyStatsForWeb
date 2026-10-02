import { useRef } from "react";
import Image from "next/image";
import { ALLOWED_IMAGE_TYPES } from "@/app/constants/validation";
import { DEFAULT_BANNER_IMAGE, isDefaultBanner } from "@/app/constants/images";
import { CameraIcon } from "@/app/components/Atomic/Icons";

const STYLES = {
  BANNER_WRAPPER: "relative h-[250px] w-full group cursor-pointer overflow-hidden bg-bg2",
  BANNER_IMG: "w-full h-full object-cover opacity-40 transition-opacity group-hover:opacity-30 duration-300",
  BANNER_OVERLAY: `text-white/50 absolute inset-0 flex items-center justify-center font-medium`,
  BANNER_BADGE: "flex items-center text1/10 z-10 gap-2 bg-black/10 px-4 py-2 rounded-full backdrop-blur-md",
  BANNER_GRADIENT: "absolute inset-0 bg-gradient-to-t from-bg1 to-transparent",
  AVATAR_WRAPPER: "relative w-40 h-40 group cursor-pointer mx-auto md:mx-0",
  AVATAR_IMG: "w-full h-full rounded-[35px] border-4 border-bg1 bg-bg2 object-cover shadow-2xl transition-all group-hover:brightness-50",
  OVERLAY_ICON: `text1 absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity`,
};

interface BannerProps {
  src: string;
  alt: string;
  label: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function BannerEditor({ src, alt, label, onChange }: BannerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className={STYLES.BANNER_WRAPPER}>
      <input type="file" ref={inputRef} accept={ALLOWED_IMAGE_TYPES.join(",")} onChange={onChange} className="hidden"/>
      {isDefaultBanner(src)
        ? <Image src={DEFAULT_BANNER_IMAGE} alt={alt} className={STYLES.BANNER_IMG} width={1100} height={390}/>
        : <img src={src} className={STYLES.BANNER_IMG} alt={alt}/>
      }
      <div className={STYLES.BANNER_OVERLAY} onClick={() => inputRef.current?.click()} style={{ cursor: 'pointer' }}>
        <div className={STYLES.BANNER_BADGE}>
          <CameraIcon size={18} /> {label}
        </div>
      </div>
      <div className={STYLES.BANNER_GRADIENT} />
    </div>
  );
}

interface AvatarProps {
  src: string;
  alt: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function AvatarEditor({ src, alt, onChange }: AvatarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className={STYLES.AVATAR_WRAPPER}>
      <input type="file" ref={inputRef} onChange={onChange} accept={ALLOWED_IMAGE_TYPES.join(",")} className="hidden"/>
      <img src={src} className={STYLES.AVATAR_IMG} alt={alt}/>
      <div className={STYLES.OVERLAY_ICON} onClick={() => inputRef.current?.click()} style={{ cursor: 'pointer' }}>
        <CameraIcon size={32} />
      </div>
    </div>
  );
}
