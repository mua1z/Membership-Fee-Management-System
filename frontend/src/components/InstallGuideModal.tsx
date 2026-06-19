import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Plus, Check, Smartphone, Monitor, Apple, Globe } from 'lucide-react';
import { getIOSInstallGuide } from '../utils/deviceDetection';

interface DeviceInfo {
  os: string;
  isIOS: boolean;
  isAndroid: boolean;
  isWindows: boolean;
  isMac: boolean;
  isLinux: boolean;
  isChromeOS: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  deviceInfo: DeviceInfo;
  targetPlatform?: string;
}

export default function InstallGuideModal({ isOpen, onClose, deviceInfo, targetPlatform }: Props) {
  if (targetPlatform === 'ios') {
    return <IOSGuide isOpen={isOpen} onClose={onClose} />;
  }

  if (targetPlatform === 'android' || targetPlatform === 'windows' || targetPlatform === 'macos') {
    const isCurrentPlatform =
      (targetPlatform === 'android' && deviceInfo.isAndroid) ||
      (targetPlatform === 'windows' && deviceInfo.isWindows) ||
      (targetPlatform === 'macos' && deviceInfo.isMac);
    return <DesktopGuide isOpen={isOpen} onClose={onClose} deviceInfo={deviceInfo} targetOs={targetPlatform} isCurrentPlatform={isCurrentPlatform} />;
  }

  if (deviceInfo.isIOS) {
    return <IOSGuide isOpen={isOpen} onClose={onClose} />;
  }

  return <DesktopGuide isOpen={isOpen} onClose={onClose} deviceInfo={deviceInfo} />;
}

function IOSGuide({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const guide = getIOSInstallGuide();
  const steps = guide.steps;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Apple className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Install on iPhone/iPad</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Add to Home Screen</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={index} className="flex gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                    {index === 0 && <Share2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                    {index === 1 && <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                    {index === 2 && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                  </div>
                  <div>
                    <p className="font-bold text-xs text-slate-900 dark:text-white mb-1">
                      {index + 1}. {step.title}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
              <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                You must use Safari browser to install the app on iPhone/iPad. Open this page in Safari and follow the steps above.
              </p>
            </div>

            <button
              onClick={onClose}
              className="mt-6 w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all duration-300"
            >
              Got it
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DesktopGuide({ isOpen, onClose, deviceInfo, targetOs, isCurrentPlatform }: { isOpen: boolean; onClose: () => void; deviceInfo: DeviceInfo; targetOs?: string; isCurrentPlatform?: boolean }) {
  const getBrowserName = () => {
    const ua = navigator.userAgent;
    if (/edge/i.test(ua)) return 'Microsoft Edge';
    if (/chrome/i.test(ua) && !/edge|opr|brave/i.test(ua)) return 'Google Chrome';
    if (/firefox/i.test(ua)) return 'Firefox';
    if (/opr|opera/i.test(ua)) return 'Opera';
    if (/brave/i.test(ua)) return 'Brave';
    if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
    return 'your browser';
  };

  const osLabel = targetOs
    ? { android: 'Android', windows: 'Windows', macos: 'macOS', linux: 'Linux', chromeos: 'ChromeOS' }[targetOs] || 'Desktop'
    : deviceInfo.isWindows ? 'Windows' : deviceInfo.isMac ? 'macOS' : deviceInfo.isLinux ? 'Linux' : 'ChromeOS';

  const getSteps = () => {
    if (!isCurrentPlatform) {
      return [
        { icon: Globe, text: `Open this website on your ${osLabel} device` },
        { icon: Monitor, text: 'Use Chrome, Edge, or Safari browser to open the page' },
        { icon: Check, text: 'Click the install icon in the address bar or use the "Install App" button' }
      ];
    }
    const browser = getBrowserName();
    if (browser === 'Safari') {
      return [
        { icon: Monitor, text: 'Click the Share button in the Safari toolbar' },
        { icon: Plus, text: 'Select "Add to Dock" or "Add to Home Screen"' },
        { icon: Check, text: 'Confirm to add the app' }
      ];
    }
    return [
      { icon: Monitor, text: `Open this page in ${browser}` },
      { icon: Plus, text: 'Click the install icon in the address bar, or find "Install Membership Fee Management System" in the browser menu' },
      { icon: Check, text: 'Click "Install" in the dialog that appears' }
    ];
  };

  const steps = getSteps();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {isCurrentPlatform ? `Install on ${osLabel}` : `Install on ${osLabel}`}
                  </h3>
                  {isCurrentPlatform && <p className="text-[10px] text-slate-500 dark:text-slate-400">via {getBrowserName()}</p>}
                  {!isCurrentPlatform && <p className="text-[10px] text-slate-500 dark:text-slate-400">Open this site on your {osLabel} device</p>}
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={index} className="flex gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                    <step.icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pt-1">
                    {index + 1}. {step.text}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={onClose}
              className="mt-6 w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all duration-300"
            >
              Got it
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
