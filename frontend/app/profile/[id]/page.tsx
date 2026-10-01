import { API_ENDPOINTS } from "@/app/constants/routes";
import { Metadata } from 'next';
import ProfilePage from "./client";
import { pathSegment } from "@/app/services/url";
import { languages } from "@/app/constants/locales/lang";
import { getServerLanguage } from "@/app/services/serverLanguage";

// On définit les types pour les paramètres de l'URL
type Props = {params: Promise<{ id: string }>};

export async function generateViewport({ params }: Props) {
  return {
    themeColor: '#1DD05D',
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = (await params).id;
  const m = languages[await getServerLanguage()].meta;
  if (!id || id === undefined) return { title: m.profileGeneric };

  // Un backend indisponible ne doit pas faire planter le rendu de la page
  let profile;
  try {
    const response = await fetch(`${API_ENDPOINTS.SIMPLE_PROFILE_DATA}/${pathSegment(id)}`, {
      next: { revalidate: 3600 } // Cache d'une heure pour les robots
    });
    if (!response.ok) return { title: m.profileNotFound };
    profile = await response.json();
  } catch {
    return { title: m.profileNotFound };
  }
  if (!profile || !profile.display_name) return { title: m.profileNotFound };
  const title = m.profileTitle(profile.display_name);
  const description = profile.bio || m.profileDescription(profile.display_name);
  
  // On utilise la bannière si elle existe, sinon l'avatar
  const imageUrl = profile.banner || profile.avatar;

  return {
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      url: `https://mystatsfy.vercel.app/profile/${pathSegment(id)}`,
      siteName: 'MyStats',
      ...(imageUrl && {
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: m.bannerAlt(profile.display_name),
          },
        ],
      }),
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      ...(imageUrl && { images: [imageUrl] }),
    },
  };
}

export default async function ServerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  return <ProfilePage id={(await params).id}/>;
}