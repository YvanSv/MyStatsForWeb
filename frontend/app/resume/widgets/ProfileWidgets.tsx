import Widget from "./Widget";
import { UserProfile } from "../interfaces";

interface ProfileWidgetProps {
  w: number;
  h: number;
  user: UserProfile;
}

export function ProfileWidget({ w, h, user }: ProfileWidgetProps) {
  const layouts = {
    "1x1":
      <div className="flex overflow-hidden items-center w-full h-full justify-center items-start">
        <span className="text-[10px] text1 font-bold uppercase truncate">{user.display_name}</span>
      </div>,
    
    "2x1":
      <div className="flex overflow-hidden items-center gap-3 w-full h-full justify-center items-start">
        <span className="text-[15px] text1 font-bold uppercase truncate">{user.display_name}</span>
      </div>,

    "3x1":
      <div className="flex overflow-hidden items-center gap-3 w-full h-full justify-center items-start">
        <span className="text-[20px] text1 font-bold uppercase truncate">{user.display_name}</span>
      </div>
    
    // vertical: <div className="flex flex-col items-center gap-3 w-full h-full justify-start">
    //   <img src={user.avatar || undefined} className="w-15 h-15 rounded-full border border-vert" alt="" />
    //   <div className="flex flex-col overflow-hidden">
    //     {pseudo}
    //   </div>
    // </div>,
    
    // large: <div className="relative w-full h-full flex flex-col items-center justify-between py-4 text-center">
    //   <div className="relative">
    //       <img src={user.avatar || undefined} className="w-16 h-16 rounded-full border-2 border-vert mb-2" alt="" />
    //       <div className="absolute -bottom-1 -right-1 bg-vert text-black p-1 rounded-full"><Plus size={10} /></div>
    //   </div>
    //   <div className="space-y-0.5">
    //     {pseudo}
    //     <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">Membre depuis 2024</p>
    //   </div>
    //   <div className="flex gap-4 mt-2">
    //     <div className="text-center">
    //         <p className="text-[10px] font-bold">128</p>
    //         <p className="text-[6px] text-gray-500 uppercase">Artistes</p>
    //     </div>
    //     <div className="text-center">
    //         <p className="text-[10px] font-bold">2.4k</p>
    //         <p className="text-[6px] text-gray-500 uppercase">Titres</p>
    //     </div>
    //   </div>
    // </div>
  }

  return (
    <div className="w-full h-full overflow-hidden flex items-center justify-center">
      <Widget w={w} h={h} layouts={layouts}/>
    </div>
  );
}