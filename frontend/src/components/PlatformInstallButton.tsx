import { useState } from 'react';
import { Smartphone, Monitor, Download, Apple } from 'lucide-react';
import { getDeviceInfo } from '../utils/deviceDetection';
import usePWAInstall from '../hooks/usePWAInstall';
import InstallGuideModal from './InstallGuideModal';

type Platform = 'android' | 'windows' | 'macos' | 'ios';

interface Props {
  platform: Platform;
}

const platformConfig: Record<Platform, { icon: typeof Smartphone; label: string }> = {
  android: { icon: Smartphone, label: 'Android' },
  windows: { icon: Monitor, label: 'Windows' },
  macos: { icon: Download, label: 'macOS' },
  ios: { icon: Apple, label: 'iOS' },
};

export default function PlatformInstallButton({ platform }: Props) {
  const [showGuide, setShowGuide] = useState(false);
  const { install, isInstalled, deferredPrompt } = usePWAInstall();
  const info = getDeviceInfo();
  const { icon: Icon, label } = platformConfig[platform];

  const isCurrentPlatform =
    (platform === 'android' && info.isAndroid) ||
    (platform === 'windows' && info.isWindows) ||
    (platform === 'macos' && info.isMac) ||
    (platform === 'ios' && info.isIOS);

  if (isInstalled) return null;

  const handleClick = async () => {
    if (isCurrentPlatform) {
      if (info.supportsBeforeInstallPrompt && deferredPrompt) {
        const result = await install();
        if (!result) {
          setShowGuide(true);
        }
        return;
      }
      if (info.isIOS) {
        setShowGuide(true);
        return;
      }
    }
    setShowGuide(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all duration-300 active:scale-95"
      >
        <Icon className="w-4 h-4" />
        {label}
      </button>

      <InstallGuideModal
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
        deviceInfo={info}
        targetPlatform={platform}
      />
    </>
  );
}
