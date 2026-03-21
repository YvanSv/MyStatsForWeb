import { API_ENDPOINTS } from "@/app/constants/routes";
import { Metadata } from 'next';
import ProfilePage from "./client";

// On définit les types pour les paramètres de l'URL
type Props = {params: { id: string }};

export async function generateViewport({ params }: Props) {
  return {
    themeColor: '#1DD05D',
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = (await params).id;
  if (!id || id === undefined) return { title: "Profil - MyStats" };

  const response = await fetch(`${API_ENDPOINTS.SIMPLE_PROFILE_DATA}/${id}`, {
    next: { revalidate: 3600 } // Cache d'une heure pour les robots
  });
  
  const profile = await response.json();
  if (!profile || !profile.display_name) return { title: "Profil introuvable - MyStats" };
  const title = `Profil de ${profile.display_name} | MyStats`;
  const description = profile.bio || `Découvrez les statistiques Spotify de ${profile.display_name}.`;
  
  // On utilise la bannière si elle existe, sinon l'avatar
  const imageUrl = profile.banner || profile.avatar;

  return {
    title: title,
    description: description,
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

export default async function ServerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  return <ProfilePage id={(await params).id}/>;
}