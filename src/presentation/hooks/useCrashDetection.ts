import { useState } from 'react';

export const useCrashDetection = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [crashTriggered, setCrashTriggered] = useState(false);
  const [isManualTrigger, setIsManualTrigger] = useState(false);

  const toggleCrashDetection = () => setIsEnabled(!isEnabled);
  const triggerManualSOS = () => setCrashTriggered(true);
  const simulateTestCrash = () => setCrashTriggered(true);
  const dismissCrashAlert = () => setCrashTriggered(false);

  return {
    isEnabled,
    toggleCrashDetection,
    crashTriggered,
    isManualTrigger,
    triggerManualSOS,
    simulateTestCrash,
    dismissCrashAlert,
  };
};
