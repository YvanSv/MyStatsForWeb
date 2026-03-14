
import { API_ENDPOINTS } from "@/app/constants/routes";
import { Metadata } from 'next';
import ProfilePage from "./client";

// On définit les types pour les paramètres de l'URL
type Props = {
  params: { id: string }
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = params.id;

  // On récupère les données du profil (depuis ton API FastAPI)
  // Note : Il est préférable d'avoir un endpoint public "getProfile"
  const response = await fetch(`${API_ENDPOINTS.PROFILE_DATA}/${id}`, {
    next: { revalidate: 3600 } // Cache d'une heure pour les robots
  });
  
  const profile = await response.json();

  if (!profile) return { title: "Profil introuvable - MyStatsFy" };

  const title = `Profil de ${profile.display_name} | MyStatsFy`;
  const description = profile.bio || `Découvrez les statistiques Spotify de ${profile.display_name}.`;
  
  // On utilise la bannière si elle existe, sinon l'avatar
  const imageUrl = profile.banner_url || profile.avatar_url;

  return {
    title: title,
    description: description,
    themeColor: '#1DD05D',
    openGraph: {
      title: title,
      description: description,
      url: `https://mystatsfy.vercel.app/profile/${id}`,
      siteName: 'MyStats',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `Bannière de ${profile.display_name}`,
        },
      ],
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: [imageUrl],
    },
  };
}

export default function ServerProfilePage({ params }: Props) {
  return (<ProfilePage id={params.id}/>);
}