"use client";
import { useRouter } from 'next/navigation';
import { AlertCircle, Lock, UserX, Home, RefreshCcw } from 'lucide-react';
import { PrimaryButton } from '../Buttons';
import { useLanguage } from '@/app/context/languageContext';

interface ErrorStateProps {
  title?: string;
  message?: string;
  status?: number;
  onRetry?: () => void;
}

export function ErrorState({ title, message, status, onRetry }: ErrorStateProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const dict = t.error;

  const getErrorConfig = () => {
    switch (status) {
      case 403:
        return {
          icon: <Lock className="text-vert" size={40} />,
          defaultTitle: dict.title1,
          defaultMessage: dict.message1
        };
      case 404:
        return {
          icon: <UserX className="text-rouge" size={40} />,
          defaultTitle: dict.title2,
          defaultMessage: dict.message2
        };
      default:
        return {
          icon: <AlertCircle className="text-rouge" size={40} />,
          defaultTitle: dict.titleDefault,
          defaultMessage: message || dict.messageDefault
        };
    }
  };

  const config = getErrorConfig();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full px-6 animate-in fade-in zoom-in duration-300">
      <div className={`flex flex-col items-center max-w-lg w-full p-8 rounded-[40px] text-center`}>
        <div className="mb-6 p-4 bg-white/5 rounded-full">
          {config.icon}
        </div>

        <h2 className="text1 text-4xl font-bold mb-3">
          {title || config.defaultTitle}
        </h2>

        <p className="text3 text-md leading-relaxed mb-12">
          {message || config.defaultMessage}
        </p>

        <div className="flex flex-col gap-3 w-full">
          {onRetry ? (
            <PrimaryButton onClick={onRetry} additional="w-full py-4 gap-2">
              <RefreshCcw size={18}/> {dict.retry}
            </PrimaryButton>
          ) : (
            <PrimaryButton onClick={() => router.push('/')} additional="w-full py-4 gap-2">
              <Home size={18}/> {dict.backhome}
            </PrimaryButton>
          )}
          
          <button onClick={() => router.back()}
            className="text3 text-[10px] uppercase font-bold tracking-widest hover:text-white transition-colors py-2"
          >{dict.backpage}</button>
        </div>
      </div>
    </div>
  );
}