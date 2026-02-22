import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Volume2, VolumeX, MapPin, Clock, Settings, Smartphone, Tv, X, RefreshCw, Copy, Check, Maximize, Minimize } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';

interface PrayerTimings {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  Sunrise: string;
  Imsak: string;
}

interface PrayerData {
  timings: PrayerTimings;
  date: {
    hijri: {
      day: string;
      month: { en: string; ar: string };
      year: string;
    };
  };
}

interface MediaItem {
  type: 'image' | 'video';
  url: string;
}

interface AppSettings {
  city: string;
  country: string;
  isMuted: boolean;
  masjidName: string;
  runningText: string;
  iqomahDuration: number;
  adhanFajrUrl: string;
  adhanDefaultUrl: string;
  enableAdhanAudio: boolean;
  calculationMethod: number;
  theme: 'digital' | 'analog';
  masjidAddress: string;
  prayerOffsets: Record<string, number>;
  mediaList: MediaItem[];
}

const AnalogClock = ({ time }: { time: Date }) => {
  const seconds = time.getSeconds();
  const minutes = time.getMinutes();
  const hours = time.getHours();

  const secondDegrees = (seconds / 60) * 360;
  const minuteDegrees = ((minutes + seconds / 60) / 60) * 360;
  const hourDegrees = ((hours % 12 + minutes / 60) / 12) * 360;

  return (
    <div className="relative w-[300px] h-[300px] md:w-[500px] md:h-[500px] rounded-full border-8 border-white/10 flex items-center justify-center bg-black/20 backdrop-blur-xl shadow-2xl">
      {/* Clock Face Markers */}
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-4 md:h-6 bg-white/20"
          style={{
            transform: `rotate(${i * 30}deg) translateY(-130px) md:translateY(-220px)`,
            transformOrigin: 'center'
          }}
        />
      ))}
      
      {/* Hour Hand */}
      <div
        className="absolute w-2 md:w-3 h-24 md:h-40 bg-white rounded-full"
        style={{
          transform: `rotate(${hourDegrees}deg) translateY(-50%)`,
          transformOrigin: '50% 100%',
          bottom: '50%'
        }}
      />
      
      {/* Minute Hand */}
      <div
        className="absolute w-1.5 md:w-2 h-32 md:h-56 bg-amber-200 rounded-full"
        style={{
          transform: `rotate(${minuteDegrees}deg) translateY(-50%)`,
          transformOrigin: '50% 100%',
          bottom: '50%'
        }}
      />
      
      {/* Second Hand */}
      <div
        className="absolute w-0.5 md:w-1 h-36 md:h-64 bg-red-500 rounded-full"
        style={{
          transform: `rotate(${secondDegrees}deg) translateY(-50%)`,
          transformOrigin: '50% 100%',
          bottom: '50%'
        }}
      />
      
      {/* Center Dot */}
      <div className="absolute w-4 h-4 bg-white rounded-full shadow-lg z-10" />
    </div>
  );
};

export default function App() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timings, setTimings] = useState<PrayerTimings | null>(null);
  const [hijriDate, setHijriDate] = useState<string>('');
  const [calculationMethod, setCalculationMethod] = useState(() => Number(localStorage.getItem('prayer_method')) || 20); // 20 is Kemenag Indonesia
  const [city, setCity] = useState(() => localStorage.getItem('prayer_city') || 'Jakarta');
  const [country, setCountry] = useState(() => localStorage.getItem('prayer_country') || 'Indonesia');
  const [masjidName, setMasjidName] = useState(() => localStorage.getItem('prayer_masjid') || 'Masjid Al-Ikhlas');
  const [masjidAddress, setMasjidAddress] = useState(() => localStorage.getItem('prayer_address') || 'Jl. Raya No. 1, Jakarta');
  const [prayerOffsets, setPrayerOffsets] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('prayer_offsets');
    return saved ? JSON.parse(saved) : { Imsak: 0, Fajr: 0, Sunrise: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 };
  });
  const [runningText, setRunningText] = useState(() => localStorage.getItem('prayer_text') || 'Selamat Datang di Rumah Allah. Mohon matikan HP saat sholat.');
  const [iqomahDuration, setIqomahDuration] = useState(() => Number(localStorage.getItem('prayer_iqomah')) || 10);
  const [adhanFajrUrl, setAdhanFajrUrl] = useState(() => localStorage.getItem('prayer_adhan_fajr') || 'https://www.islamcan.com/audio/adhan/azan1.mp3');
  const [adhanDefaultUrl, setAdhanDefaultUrl] = useState(() => localStorage.getItem('prayer_adhan_default') || 'https://www.islamcan.com/audio/adhan/azan2.mp3');
  const [enableAdhanAudio, setEnableAdhanAudio] = useState(() => localStorage.getItem('prayer_adhan_enabled') !== 'false');
  const [theme, setTheme] = useState<'digital' | 'analog'>(() => (localStorage.getItem('prayer_theme') as 'digital' | 'analog') || 'digital');
  const [mediaList, setMediaList] = useState<MediaItem[]>(() => {
    const saved = localStorage.getItem('prayer_media');
    return saved ? JSON.parse(saved) : [
      { type: 'image', url: 'https://picsum.photos/seed/masjid1/1920/1080' },
      { type: 'image', url: 'https://picsum.photos/seed/masjid2/1920/1080' }
    ];
  });
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  
  const [isAdhanPlaying, setIsAdhanPlaying] = useState(false);
  const [isIqomahCountdown, setIsIqomahCountdown] = useState(false);
  const [iqomahTimeLeft, setIqomahTimeLeft] = useState(0);
  
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('prayer_muted') === 'true');
  const [showSettings, setShowSettings] = useState(false);
  const [nextPrayer, setNextPrayer] = useState<{ name: string; label: string; time: string } | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [wakeLock, setWakeLock] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Remote Control State
  const [roomId, setRoomId] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlRoom = urlParams.get('room');
    if (urlRoom) {
      localStorage.setItem('prayer_room_id', urlRoom);
      return urlRoom;
    }
    
    const savedRoom = localStorage.getItem('prayer_room_id');
    if (savedRoom) return savedRoom;
    
    const newRoom = Math.random().toString(36).substring(2, 8).toUpperCase();
    localStorage.setItem('prayer_room_id', newRoom);
    return newRoom;
  });
  const [isRemoteMode, setIsRemoteMode] = useState(() => new URLSearchParams(window.location.search).has('remote'));
  const [socket, setSocket] = useState<Socket | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const prayerNames = [
    { id: 'Imsak', label: 'Imsak' },
    { id: 'Fajr', label: 'Subuh' },
    { id: 'Sunrise', label: 'Terbit' },
    { id: 'Dhuhr', label: 'Dzuhur' },
    { id: 'Asr', label: 'Ashar' },
    { id: 'Maghrib', label: 'Maghrib' },
    { id: 'Isha', label: 'Isya' },
  ];

  // Screen Wake Lock
  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          const lock = await (navigator as any).wakeLock.request('screen');
          setWakeLock(lock);
          console.log('Wake Lock is active');
        } catch (err: any) {
          // Silently fail if not allowed yet (needs user interaction)
          console.warn(`${err.name}, ${err.message}`);
        }
      }
    };

    // Try requesting on mount, but also add a listener for first interaction
    requestWakeLock();

    const handleInteraction = () => {
      if (!wakeLock) requestWakeLock();
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);

    const handleVisibilityChange = () => {
      if (wakeLock !== null && document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Initialize Socket
  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.emit('join-room', roomId);

    newSocket.on('state-update', (settings: AppSettings) => {
      if (settings.city) setCity(settings.city);
      if (settings.country) setCountry(settings.country);
      if (settings.isMuted !== undefined) setIsMuted(settings.isMuted);
      if (settings.masjidName) setMasjidName(settings.masjidName);
      if (settings.runningText) setRunningText(settings.runningText);
      if (settings.iqomahDuration) setIqomahDuration(settings.iqomahDuration);
      if (settings.adhanFajrUrl) setAdhanFajrUrl(settings.adhanFajrUrl);
      if (settings.adhanDefaultUrl) setAdhanDefaultUrl(settings.adhanDefaultUrl);
      if (settings.enableAdhanAudio !== undefined) setEnableAdhanAudio(settings.enableAdhanAudio);
      if (settings.calculationMethod !== undefined) setCalculationMethod(settings.calculationMethod);
      if (settings.theme) setTheme(settings.theme);
      if (settings.masjidAddress) setMasjidAddress(settings.masjidAddress);
      if (settings.prayerOffsets) setPrayerOffsets(settings.prayerOffsets);
      if (settings.mediaList) setMediaList(settings.mediaList);
      
      if (settings.city) localStorage.setItem('prayer_city', settings.city);
      if (settings.country) localStorage.setItem('prayer_country', settings.country);
      if (settings.isMuted !== undefined) localStorage.setItem('prayer_muted', String(settings.isMuted));
      if (settings.masjidName) localStorage.setItem('prayer_masjid', settings.masjidName);
      if (settings.runningText) localStorage.setItem('prayer_text', settings.runningText);
      if (settings.iqomahDuration) localStorage.setItem('prayer_iqomah', String(settings.iqomahDuration));
      if (settings.masjidAddress) localStorage.setItem('prayer_address', settings.masjidAddress);
      if (settings.prayerOffsets) localStorage.setItem('prayer_offsets', JSON.stringify(settings.prayerOffsets));
      if (settings.mediaList) localStorage.setItem('prayer_media', JSON.stringify(settings.mediaList));
      if (settings.adhanFajrUrl) localStorage.setItem('prayer_adhan_fajr', settings.adhanFajrUrl);
      if (settings.adhanDefaultUrl) localStorage.setItem('prayer_adhan_default', settings.adhanDefaultUrl);
      if (settings.enableAdhanAudio !== undefined) localStorage.setItem('prayer_adhan_enabled', String(settings.enableAdhanAudio));
      if (settings.calculationMethod !== undefined) localStorage.setItem('prayer_method', String(settings.calculationMethod));
      if (settings.theme) localStorage.setItem('prayer_theme', settings.theme);
    });

    newSocket.on('remote-action', (action: string) => {
      if (action === 'play-adhan') playAdhan();
      if (action === 'stop-adhan') stopAdhan();
      if (action === 'start-iqomah') startIqomah();
      if (action === 'toggle-fullscreen') toggleFullscreen();
    });

    return () => {
      newSocket.disconnect();
    };
  }, [roomId]);

  // Sync settings to socket
  const syncSettings = (updates: Partial<AppSettings>) => {
    const currentSettings: AppSettings = {
      city, country, isMuted, masjidName, masjidAddress, prayerOffsets, mediaList, runningText, iqomahDuration,
      adhanFajrUrl, adhanDefaultUrl, enableAdhanAudio, calculationMethod,
      theme,
      ...updates
    };
    if (socket) {
      socket.emit('update-settings', {
        roomId,
        settings: currentSettings
      });
    }
  };

  const adjustedTimings = useMemo(() => {
    if (!timings) return null;
    const adjusted: any = {};
    Object.keys(timings).forEach(key => {
      const timeStr = timings[key as keyof PrayerTimings];
      const offset = prayerOffsets[key] || 0;
      if (offset === 0) {
        adjusted[key] = timeStr;
      } else {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        date.setMinutes(date.getMinutes() + offset);
        adjusted[key] = format(date, 'HH:mm');
      }
    });
    return adjusted as PrayerTimings;
  }, [timings, prayerOffsets]);

  // Update clock every second and rotate media
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      
      if (isIqomahCountdown && iqomahTimeLeft > 0) {
        setIqomahTimeLeft(prev => prev - 1);
      } else if (isIqomahCountdown && iqomahTimeLeft === 0) {
        setIsIqomahCountdown(false);
      }
    }, 1000);

    const mediaTimer = setInterval(() => {
      if (mediaList.length > 0) {
        setCurrentMediaIndex(prev => (prev + 1) % mediaList.length);
      }
    }, 10000); // Rotate every 10 seconds
    
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(timer);
      clearInterval(mediaTimer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isIqomahCountdown, iqomahTimeLeft, mediaList.length]);

  // Fetch prayer times
  useEffect(() => {
    const fetchPrayerTimes = async () => {
      const cached = localStorage.getItem(`prayer_data_${city}_${country}_${calculationMethod}`);
      if (cached) {
        const data = JSON.parse(cached);
        setTimings(data.timings);
        const h = data.date.hijri;
        setHijriDate(`${h.day} ${h.month.en} ${h.year} H`);
      }

      if (!navigator.onLine) return;

      try {
        const response = await axios.get(`https://api.aladhan.com/v1/timingsByCity`, {
          params: {
            city: city,
            country: country,
            method: calculationMethod,
          },
        });
        const data = response.data.data;
        setTimings(data.timings);
        const h = data.date.hijri;
        setHijriDate(`${h.day} ${h.month.en} ${h.year} H`);
        localStorage.setItem(`prayer_data_${city}_${country}_${calculationMethod}`, JSON.stringify(data));
      } catch (error) {
        console.error('Error fetching prayer times:', error);
      }
    };

    fetchPrayerTimes();
  }, [city, country, calculationMethod]);

  // Determine next prayer and trigger adhan
  useEffect(() => {
    if (!adjustedTimings) return;

    const nowStr = format(currentTime, 'HH:mm');

    let foundNext = false;
    for (const prayer of prayerNames) {
      const time = adjustedTimings[prayer.id as keyof PrayerTimings];
      if (time > nowStr) {
        setNextPrayer({ name: prayer.id, label: prayer.label, time });
        foundNext = true;
        break;
      }
    }

    if (!foundNext) {
      setNextPrayer({ name: 'Imsak', label: 'Imsak', time: adjustedTimings.Imsak });
    }

    // Check for Adhan trigger
    const currentPrayer = prayerNames.find(p => p.id !== 'Sunrise' && p.id !== 'Imsak' && adjustedTimings[p.id as keyof PrayerTimings] === nowStr);
    
    if (currentPrayer && !isAdhanPlaying && !isMuted && currentTime.getSeconds() === 0) {
      playAdhan(currentPrayer.id);
    }
  }, [currentTime, adjustedTimings, isMuted, enableAdhanAudio]);

  const playAdhan = (prayerId?: string) => {
    if (audioRef.current) {
      if (enableAdhanAudio) {
        const url = prayerId === 'Fajr' ? adhanFajrUrl : adhanDefaultUrl;
        audioRef.current.src = url;
        audioRef.current.play().catch(e => console.error("Audio play failed", e));
      }
      setIsAdhanPlaying(true);
      setIsIqomahCountdown(false);
    }
  };

  const stopAdhan = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsAdhanPlaying(false);
      // Start Iqomah countdown after adhan stops
      startIqomah();
    }
  };

  const startIqomah = () => {
    setIqomahTimeLeft(iqomahDuration * 60);
    setIsIqomahCountdown(true);
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    localStorage.setItem('prayer_muted', String(newMuted));
    if (newMuted) stopAdhan();
    syncSettings({ isMuted: newMuted });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const updateLocation = (newCity: string, newCountry: string) => {
    setCity(newCity);
    setCountry(newCountry);
    localStorage.setItem('prayer_city', newCity);
    localStorage.setItem('prayer_country', newCountry);
    syncSettings({ city: newCity, country: newCountry });
  };

  const updateMasjidSettings = (name: string, text: string, iqomah: number, fajrUrl?: string, defaultUrl?: string, enabled?: boolean, method?: number, newTheme?: 'digital' | 'analog', address?: string, offsets?: Record<string, number>, newMedia?: MediaItem[]) => {
    setMasjidName(name);
    setRunningText(text);
    setIqomahDuration(iqomah);
    if (fajrUrl !== undefined) setAdhanFajrUrl(fajrUrl);
    if (defaultUrl !== undefined) setAdhanDefaultUrl(defaultUrl);
    if (enabled !== undefined) setEnableAdhanAudio(enabled);
    if (method !== undefined) setCalculationMethod(method);
    if (newTheme !== undefined) setTheme(newTheme);
    if (address !== undefined) setMasjidAddress(address);
    if (offsets !== undefined) setPrayerOffsets(offsets);
    if (newMedia !== undefined) setMediaList(newMedia);

    localStorage.setItem('prayer_masjid', name);
    localStorage.setItem('prayer_text', text);
    localStorage.setItem('prayer_iqomah', String(iqomah));
    if (fajrUrl !== undefined) localStorage.setItem('prayer_adhan_fajr', fajrUrl);
    if (defaultUrl !== undefined) localStorage.setItem('prayer_adhan_default', defaultUrl);
    if (enabled !== undefined) localStorage.setItem('prayer_adhan_enabled', String(enabled));
    if (method !== undefined) localStorage.setItem('prayer_method', String(method));
    if (newTheme !== undefined) localStorage.setItem('prayer_theme', newTheme);
    if (address !== undefined) localStorage.setItem('prayer_address', address);
    if (offsets !== undefined) localStorage.setItem('prayer_offsets', JSON.stringify(offsets));
    if (newMedia !== undefined) localStorage.setItem('prayer_media', JSON.stringify(newMedia));

    syncSettings({ 
      masjidName: name, 
      runningText: text, 
      iqomahDuration: iqomah,
      adhanFajrUrl: fajrUrl || adhanFajrUrl,
      adhanDefaultUrl: defaultUrl || adhanDefaultUrl,
      enableAdhanAudio: enabled !== undefined ? enabled : enableAdhanAudio,
      calculationMethod: method !== undefined ? method : calculationMethod,
      theme: newTheme || theme,
      masjidAddress: address || masjidAddress,
      prayerOffsets: offsets || prayerOffsets,
      mediaList: newMedia || mediaList
    });
  };

  const remoteUrl = `${window.location.origin}?room=${roomId}&remote=true`;
  const isFriday = currentTime.getDay() === 5;

  const copyRemoteLink = () => {
    navigator.clipboard.writeText(remoteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const changeRoomId = (newId: string) => {
    const cleanId = newId.toUpperCase().trim();
    if (cleanId) {
      setRoomId(cleanId);
      localStorage.setItem('prayer_room_id', cleanId);
      // Re-join room if socket exists
      if (socket) {
        socket.emit('join-room', cleanId);
      }
    }
  };

  if (isRemoteMode) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col selection:bg-emerald-500/30">
        {/* Mobile App Header */}
        <header className="sticky top-0 z-20 bg-zinc-900/80 backdrop-blur-xl border-b border-white/5 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-xl shadow-lg shadow-emerald-500/20">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Panel Admin Vendor</h1>
              <p className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold">Kontrol Jarak Jauh (Multi-Masjid)</p>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-mono bg-white/5 px-2 py-1 rounded-md border border-white/10">ROOM: {roomId}</span>
          </div>
        </header>

        <main className="flex-1 p-5 space-y-6 overflow-y-auto pb-24">
          {/* Live Preview Card */}
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 ml-1">Live Preview (Running Text)</h2>
            <div className="bg-zinc-900 rounded-3xl p-6 border border-white/5 overflow-hidden">
              <div className="whitespace-nowrap animate-marquee inline-block">
                <span className="text-xl font-serif italic text-amber-200/80">
                  {runningText}
                </span>
              </div>
            </div>
          </section>

          {/* Quick Actions Card */}
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 ml-1">Kontrol Cepat</h2>
            <div className="grid grid-cols-2 gap-3">
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => socket?.emit('trigger-action', { roomId, action: 'play-adhan' })}
                className="bg-emerald-600 h-28 rounded-3xl flex flex-col items-center justify-center gap-2 shadow-xl shadow-emerald-900/20 active:bg-emerald-700 transition-colors"
              >
                <div className="bg-white/20 p-2 rounded-full">
                  <Volume2 className="h-6 w-6" />
                </div>
                <span className="font-bold text-sm">Tes Adzan</span>
              </motion.button>
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => socket?.emit('trigger-action', { roomId, action: 'stop-adhan' })}
                className="bg-zinc-800 h-28 rounded-3xl flex flex-col items-center justify-center gap-2 border border-white/5 active:bg-zinc-700 transition-colors"
              >
                <div className="bg-white/10 p-2 rounded-full">
                  <X className="h-6 w-6" />
                </div>
                <span className="font-bold text-sm">Stop Adzan</span>
              </motion.button>
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => socket?.emit('trigger-action', { roomId, action: 'start-iqomah' })}
                className="bg-amber-600 h-20 rounded-3xl flex items-center justify-center gap-3 col-span-2 shadow-xl shadow-amber-900/20 active:bg-amber-700 transition-colors"
              >
                <Clock className="h-5 w-5" />
                <span className="font-bold">Mulai Hitung Mundur Iqomah</span>
              </motion.button>
            </div>
          </section>

          {/* Masjid Info Section */}
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 ml-1">Identitas Masjid</h2>
            <div className="bg-zinc-900 rounded-[2rem] p-6 border border-white/5 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Nama Masjid / Mushola</label>
                <input 
                  type="text" 
                  value={masjidName}
                  onChange={(e) => updateMasjidSettings(e.target.value, runningText, iqomahDuration, adhanFajrUrl, adhanDefaultUrl, enableAdhanAudio, calculationMethod, theme, masjidAddress, prayerOffsets)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-emerald-500 outline-none text-lg font-medium transition-all"
                  placeholder="Masukkan nama..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Alamat Masjid</label>
                <input 
                  type="text" 
                  value={masjidAddress}
                  onChange={(e) => updateMasjidSettings(masjidName, runningText, iqomahDuration, adhanFajrUrl, adhanDefaultUrl, enableAdhanAudio, calculationMethod, theme, e.target.value, prayerOffsets)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-emerald-500 outline-none text-lg font-medium transition-all"
                  placeholder="Masukkan alamat..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Running Text (Pengumuman)</label>
                <textarea 
                  value={runningText}
                  onChange={(e) => updateMasjidSettings(masjidName, e.target.value, iqomahDuration, adhanFajrUrl, adhanDefaultUrl, enableAdhanAudio, calculationMethod, theme, masjidAddress, prayerOffsets)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-emerald-500 outline-none h-32 text-base transition-all resize-none"
                  placeholder="Tulis pengumuman di sini..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Jeda Iqomah</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={iqomahDuration}
                      onChange={(e) => updateMasjidSettings(masjidName, runningText, Number(e.target.value), adhanFajrUrl, adhanDefaultUrl, enableAdhanAudio, calculationMethod, theme, masjidAddress, prayerOffsets)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pr-12 focus:border-emerald-500 outline-none text-lg font-bold transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold opacity-40">MENIT</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Tema Jam</label>
                  <select 
                    value={theme}
                    onChange={(e) => updateMasjidSettings(masjidName, runningText, iqomahDuration, adhanFajrUrl, adhanDefaultUrl, enableAdhanAudio, calculationMethod, e.target.value as 'digital' | 'analog')}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-emerald-500 outline-none text-lg font-bold transition-all appearance-none"
                  >
                    <option value="digital">Digital</option>
                    <option value="analog">Analog</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Suara TV</label>
                  <button 
                    onClick={toggleMute}
                    className={`w-full h-[60px] rounded-2xl flex items-center justify-center gap-2 transition-all ${isMuted ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}
                  >
                    {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    <span className="font-bold text-xs">{isMuted ? 'Muted' : 'Aktif'}</span>
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Layar TV</label>
                  <button 
                    onClick={() => socket?.emit('trigger-action', { roomId, action: 'toggle-fullscreen' })}
                    className="w-full h-[60px] rounded-2xl flex items-center justify-center gap-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 active:bg-blue-500/40 transition-all"
                  >
                    <Maximize className="h-5 w-5" />
                    <span className="font-bold text-xs">Fullscreen</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Prayer Offsets Section */}
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 ml-1">Koreksi Jadwal (Menit)</h2>
            <div className="bg-zinc-900 rounded-[2rem] p-6 border border-white/5 grid grid-cols-2 gap-4">
              {prayerNames.map(p => (
                <div key={p.id} className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-amber-500">{p.label}</label>
                  <input 
                    type="number" 
                    value={prayerOffsets[p.id] || 0}
                    onChange={(e) => {
                      const newOffsets = { ...prayerOffsets, [p.id]: Number(e.target.value) };
                      updateMasjidSettings(masjidName, runningText, iqomahDuration, adhanFajrUrl, adhanDefaultUrl, enableAdhanAudio, calculationMethod, theme, masjidAddress, newOffsets);
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 focus:border-amber-500 outline-none text-lg font-bold"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Adhan Settings Section */}
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 ml-1">Pengaturan Adzan</h2>
            <div className="bg-zinc-900 rounded-[2rem] p-6 border border-white/5 space-y-5">
              <div className="flex items-center justify-between p-2">
                <div className="space-y-1">
                  <p className="text-sm font-bold">Putar Suara Adzan</p>
                  <p className="text-[10px] opacity-50">Aktifkan suara adzan otomatis</p>
                </div>
                <button 
                  onClick={() => updateMasjidSettings(masjidName, runningText, iqomahDuration, adhanFajrUrl, adhanDefaultUrl, !enableAdhanAudio)}
                  className={`w-14 h-8 rounded-full transition-all relative ${enableAdhanAudio ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                >
                  <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${enableAdhanAudio ? 'right-1' : 'left-1'}`} />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Metode Perhitungan</label>
                <select 
                  value={calculationMethod}
                  onChange={(e) => updateMasjidSettings(masjidName, runningText, iqomahDuration, adhanFajrUrl, adhanDefaultUrl, enableAdhanAudio, Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-emerald-500 outline-none text-sm font-medium transition-all appearance-none"
                >
                  <option value={20}>Kemenag Indonesia</option>
                  <option value={1}>Karachi (Univ. of Islamic Sciences)</option>
                  <option value={2}>ISNA (North America)</option>
                  <option value={3}>MWL (Muslim World League)</option>
                  <option value={4}>Umm al-Qura (Makkah)</option>
                  <option value={5}>Egyptian General Authority</option>
                  <option value={11}>Singapura (MUIS)</option>
                  <option value={12}>Malaysia (JAKIM)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">URL Adzan Subuh</label>
                <input 
                  type="text" 
                  value={adhanFajrUrl}
                  onChange={(e) => updateMasjidSettings(masjidName, runningText, iqomahDuration, e.target.value, adhanDefaultUrl, enableAdhanAudio)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-emerald-500 outline-none text-xs font-mono transition-all"
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">URL Adzan Lainnya</label>
                <input 
                  type="text" 
                  value={adhanDefaultUrl}
                  onChange={(e) => updateMasjidSettings(masjidName, runningText, iqomahDuration, adhanFajrUrl, e.target.value, enableAdhanAudio)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-emerald-500 outline-none text-xs font-mono transition-all"
                  placeholder="https://..."
                />
              </div>
            </div>
          </section>

          {/* Location Section */}
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 ml-1">Lokasi & Jadwal</h2>
            <div className="bg-zinc-900 rounded-[2rem] p-6 border border-white/5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <input 
                  type="text" 
                  value={city}
                  onChange={(e) => updateLocation(e.target.value, country)}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 focus:border-emerald-500 outline-none text-sm"
                  placeholder="Kota"
                />
                <input 
                  type="text" 
                  value={country}
                  onChange={(e) => updateLocation(city, e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 focus:border-emerald-500 outline-none text-sm"
                  placeholder="Negara"
                />
              </div>
              <div className="pt-2 flex items-center justify-center gap-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                <RefreshCw className={`h-3 w-3 ${isOffline ? '' : 'animate-spin'}`} />
                {isOffline ? 'Mode Offline' : 'Sinkronisasi Otomatis'}
              </div>
            </div>
          </section>
        </main>

        {/* Bottom Navigation / Status */}
        <footer className="fixed bottom-0 left-0 right-0 bg-zinc-900/90 backdrop-blur-2xl border-t border-white/5 p-4 flex items-center justify-center">
          <div className="flex items-center gap-2 text-emerald-500">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Sistem Berjalan Normal</span>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#050505] text-white font-sans">
      {/* Background Image - Kaaba / Mosque */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=2070&auto=format&fit=crop"
          alt="Kaaba Background"
          className="h-full w-full object-cover opacity-40 scale-105"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/90" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
      </div>

      {/* Audio Element */}
      <audio 
        ref={audioRef} 
        src="https://www.islamcan.com/audio/adhan/azan1.mp3" 
        onEnded={() => {
          setIsAdhanPlaying(false);
          startIqomah();
        }}
      />

      {/* Header Info */}
      <div className="relative z-10 flex items-center justify-between p-8 md:p-12">
        <div className="flex items-center gap-8">
          <div className="flex flex-col">
            <h2 className="text-4xl md:text-6xl font-serif font-medium tracking-tight text-amber-200 drop-shadow-[0_2px_10px_rgba(251,191,36,0.3)]">
              {masjidName}
            </h2>
            <p className="text-lg md:text-xl font-serif italic text-white/60 mt-1">
              {masjidAddress}
            </p>
            <div className="flex items-center gap-3 mt-3 opacity-70">
              <MapPin className="h-4 w-4 text-amber-400" />
              <p className="text-xl font-light tracking-wide">{city}, {country}</p>
            </div>
          </div>
          {isOffline && (
            <div className="flex items-center gap-2 bg-red-500/20 px-4 py-1.5 rounded-full border border-red-500/30 backdrop-blur-md">
              <RefreshCw className="h-3 w-3 text-red-400 animate-spin" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">Offline Mode</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end">
             <div className="flex items-center gap-2 bg-white/5 px-5 py-2.5 rounded-full border border-white/10 backdrop-blur-xl">
              <Smartphone className="h-4 w-4 text-amber-400 opacity-70" />
              <span className="text-xs font-mono opacity-60 tracking-tighter">REMOTE ID: {roomId}</span>
            </div>
          </div>
          <button 
            onClick={toggleFullscreen}
            className="rounded-full bg-white/5 p-4 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all group"
            title={isFullscreen ? "Keluar Fullscreen" : "Masuk Fullscreen"}
          >
            {isFullscreen ? <Minimize className="h-7 w-7 text-amber-400" /> : <Maximize className="h-7 w-7 text-amber-400 group-hover:scale-110 transition-transform" />}
          </button>
          <button 
            onClick={toggleMute}
            className="rounded-full bg-white/5 p-4 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all group"
          >
            {isMuted ? <VolumeX className="h-7 w-7 text-red-400" /> : <Volume2 className="h-7 w-7 text-amber-400 group-hover:scale-110 transition-transform" />}
          </button>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="rounded-full bg-white/5 p-4 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all"
          >
            <Settings className="h-7 w-7 text-white/80" />
          </button>
        </div>
      </div>

      {/* Main Clock Section */}
      <main className="relative z-10 flex flex-col items-center justify-center pt-8 md:pt-16">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="mb-4 inline-block px-6 py-1 border-y border-amber-500/30">
             <p className="text-xl md:text-2xl font-serif italic text-amber-200/80 tracking-[0.3em] uppercase">
                {format(currentTime, 'EEEE', { locale: id })}
             </p>
          </div>
          
          {theme === 'digital' ? (
            <h1 className="text-[12rem] md:text-[22rem] font-serif font-light tracking-tighter leading-none text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
              {format(currentTime, 'HH:mm')}
              <span className="text-3xl md:text-7xl ml-6 opacity-30 font-mono font-thin align-top mt-12 inline-block">
                {format(currentTime, 'ss')}
              </span>
            </h1>
          ) : (
            <div className="flex justify-center my-8">
              <AnalogClock time={currentTime} />
            </div>
          )}
          
          <div className="mt-2 space-y-2">
            <p className="text-3xl md:text-5xl font-serif font-light text-white/90 tracking-[0.15em]">
              {format(currentTime, 'd MMMM yyyy', { locale: id })}
            </p>
            {hijriDate && (
              <p className="text-2xl md:text-3xl font-serif italic text-amber-200/60 tracking-[0.1em]">
                {hijriDate}
              </p>
            )}
          </div>
        </motion.div>

        {/* Media Carousel */}
        {mediaList.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-12 w-full max-w-5xl aspect-video rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl relative bg-black/40 backdrop-blur-md"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentMediaIndex}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 1 }}
                className="absolute inset-0"
              >
                {mediaList[currentMediaIndex].type === 'image' ? (
                  <img 
                    src={mediaList[currentMediaIndex].url} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    alt="Informasi Masjid"
                  />
                ) : (
                  <video 
                    src={mediaList[currentMediaIndex].url} 
                    className="w-full h-full object-cover"
                    autoPlay 
                    muted 
                    loop 
                    playsInline
                  />
                )}
                {/* Overlay for readability if needed */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </motion.div>
            </AnimatePresence>
            
            {/* Indicators */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {mediaList.map((_, idx) => (
                <div 
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentMediaIndex ? 'w-8 bg-amber-400' : 'w-2 bg-white/20'}`}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Friday Special Info */}
        {isFriday && nextPrayer?.name === 'Dhuhr' && (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mt-10 bg-amber-600/20 border border-amber-500/40 px-12 py-5 rounded-[2rem] backdrop-blur-3xl shadow-[0_0_40px_rgba(217,119,6,0.2)]"
          >
            <h3 className="text-3xl font-serif italic tracking-[0.2em] text-amber-300">Persiapan Khutbah Jumat</h3>
          </motion.div>
        )}

        {nextPrayer && !isIqomahCountdown && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-16 flex items-center gap-8 rounded-full bg-white/5 px-16 py-6 backdrop-blur-2xl border border-white/10 shadow-2xl"
          >
            <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <span className="text-2xl font-light tracking-[0.1em] uppercase">
              Menuju <span className="text-amber-300 font-medium">{nextPrayer.label}</span> <span className="opacity-40 mx-2">—</span> {nextPrayer.time}
            </span>
          </motion.div>
        )}
      </main>

      {/* Iqomah Countdown Overlay */}
      <AnimatePresence>
        {isIqomahCountdown && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/95 backdrop-blur-3xl"
          >
            <div className="absolute inset-0 opacity-10 pointer-events-none">
               <img src="https://images.unsplash.com/photo-1542810634-71277d95dcbb?q=80&w=2070" className="w-full h-full object-cover" />
            </div>
            <h2 className="text-6xl font-serif italic tracking-[0.4em] text-amber-500 mb-12">Menuju Iqomah</h2>
            <div className="text-[18rem] md:text-[30rem] font-serif font-light leading-none text-white drop-shadow-[0_0_80px_rgba(251,191,36,0.2)]">
              {Math.floor(iqomahTimeLeft / 60)}:{(iqomahTimeLeft % 60).toString().padStart(2, '0')}
            </div>
            <p className="mt-12 text-4xl font-serif italic opacity-70 tracking-widest">Luruskan dan Rapatkan Shaf</p>
            <button 
              onClick={() => setIsIqomahCountdown(false)}
              className="mt-20 rounded-full border border-amber-500/30 bg-amber-500/5 px-16 py-6 text-2xl font-serif italic tracking-widest hover:bg-amber-500 hover:text-black transition-all"
            >
              Lewati Hitung Mundur
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Running Text */}
      <div className="absolute bottom-44 md:bottom-64 left-0 right-0 z-10 bg-black/60 backdrop-blur-xl border-y border-white/5 py-6 overflow-hidden">
        <div className="whitespace-nowrap animate-marquee inline-block">
          <span className="text-3xl md:text-5xl font-serif italic tracking-wider mx-16 text-amber-100/80">
            {runningText} <span className="mx-10 opacity-30">❈</span> {runningText} <span className="mx-10 opacity-30">❈</span> {runningText}
          </span>
        </div>
      </div>

      {/* Prayer Times Grid */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-8 md:p-12">
        <div className="mx-auto max-w-[98%]">
          <div className="grid grid-cols-4 md:grid-cols-7 gap-6 md:gap-10">
            {prayerNames.map((prayer) => {
              const time = adjustedTimings ? adjustedTimings[prayer.id as keyof PrayerTimings] : '--:--';
              const isNext = nextPrayer?.name === prayer.id;
              
              return (
                <motion.div
                  key={prayer.id}
                  whileHover={{ y: -15, scale: 1.02 }}
                  className={`relative overflow-hidden rounded-[2.5rem] p-8 md:p-12 backdrop-blur-3xl border transition-all duration-500 ${
                    isNext 
                      ? 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_80px_rgba(251,191,36,0.25)]' 
                      : 'bg-white/5 border-white/5'
                  }`}
                >
                  <p className="text-lg md:text-2xl font-serif italic tracking-[0.1em] opacity-60 mb-6 text-amber-50/80">
                    {prayer.label}
                  </p>
                  <p className="text-5xl md:text-7xl font-serif font-light tracking-tighter text-white">
                    {time}
                  </p>
                  {isNext && (
                    <div className="absolute top-8 right-8">
                      <div className="h-4 w-4 rounded-full bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.8)] animate-pulse" />
                    </div>
                  )}
                  {/* Subtle Ornament */}
                  <div className="absolute -bottom-4 -right-4 opacity-5">
                     <div className="w-24 h-24 border-4 border-amber-500 rounded-full rotate-45" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Creator Credit */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 opacity-20 hover:opacity-100 transition-opacity duration-500">
        <p className="text-[10px] uppercase tracking-[0.5em] font-serif italic text-amber-200">
          Created by caqiestudioproduction
        </p>
      </div>

      {/* Adhan Playing Overlay */}
      <AnimatePresence>
        {isAdhanPlaying && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-3xl"
          >
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20" />
              <div className="relative rounded-full bg-emerald-500 p-20 shadow-[0_0_150px_rgba(16,185,129,0.6)]">
                <Volume2 className="h-32 w-32 text-white" />
              </div>
            </div>
            <h2 className="mt-20 text-7xl md:text-9xl font-light tracking-[0.3em] uppercase text-center">Waktu Sholat</h2>
            <p className="mt-8 text-3xl md:text-4xl opacity-60 italic tracking-[0.2em]">Panggilan untuk beribadah...</p>
            <button 
              onClick={stopAdhan}
              className="mt-20 rounded-full border border-white/20 px-20 py-8 text-2xl font-semibold uppercase tracking-widest hover:bg-white hover:text-black transition-all"
            >
              Hentikan Adzan & Mulai Iqomah
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
          >
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowSettings(false)} />
            <div className="relative w-full max-w-6xl rounded-[4rem] bg-zinc-900 p-16 border border-white/10 shadow-2xl overflow-hidden">
              <div className="grid md:grid-cols-2 gap-16">
                <div className="space-y-8">
                  <h3 className="text-4xl font-bold mb-10 flex items-center gap-4">
                    <Settings className="text-emerald-500 h-10 w-10" />
                    Panel Admin Masjid (Pengaturan Lokal)
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-widest opacity-50 mb-3">Nama Masjid/Mushola</label>
                      <input 
                        type="text" 
                        value={masjidName}
                        onChange={(e) => updateMasjidSettings(e.target.value, runningText, iqomahDuration, adhanFajrUrl, adhanDefaultUrl, enableAdhanAudio, calculationMethod, theme, masjidAddress, prayerOffsets)}
                        className="w-full rounded-2xl bg-white/5 border border-white/10 p-6 focus:outline-none focus:border-emerald-500 transition-all text-2xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-widest opacity-50 mb-3">Alamat Masjid</label>
                      <input 
                        type="text" 
                        value={masjidAddress}
                        onChange={(e) => updateMasjidSettings(masjidName, runningText, iqomahDuration, adhanFajrUrl, adhanDefaultUrl, enableAdhanAudio, calculationMethod, theme, e.target.value, prayerOffsets)}
                        className="w-full rounded-2xl bg-white/5 border border-white/10 p-6 focus:outline-none focus:border-emerald-500 transition-all text-xl"
                        placeholder="Masukkan alamat lengkap..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-widest opacity-50 mb-3">Running Text</label>
                      <textarea 
                        value={runningText}
                        onChange={(e) => updateMasjidSettings(masjidName, e.target.value, iqomahDuration, adhanFajrUrl, adhanDefaultUrl, enableAdhanAudio, calculationMethod, theme, masjidAddress, prayerOffsets)}
                        className="w-full rounded-2xl bg-white/5 border border-white/10 p-6 focus:outline-none focus:border-emerald-500 transition-all text-xl h-32"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                       <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest opacity-50 mb-3">Jeda Iqomah (Menit)</label>
                        <input 
                          type="number" 
                          value={iqomahDuration}
                          onChange={(e) => updateMasjidSettings(masjidName, runningText, Number(e.target.value))}
                          className="w-full rounded-2xl bg-white/5 border border-white/10 p-6 focus:outline-none focus:border-emerald-500 transition-all text-2xl"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest opacity-50 mb-3">Metode Perhitungan</label>
                        <select 
                          value={calculationMethod}
                          onChange={(e) => updateMasjidSettings(masjidName, runningText, iqomahDuration, adhanFajrUrl, adhanDefaultUrl, enableAdhanAudio, Number(e.target.value))}
                          className="w-full rounded-2xl bg-white/5 border border-white/10 p-6 focus:outline-none focus:border-emerald-500 transition-all text-xl appearance-none"
                        >
                          <option value={20}>Kemenag Indonesia</option>
                          <option value={1}>Karachi (Univ. of Islamic Sciences)</option>
                          <option value={2}>ISNA (North America)</option>
                          <option value={3}>MWL (Muslim World League)</option>
                          <option value={4}>Umm al-Qura (Makkah)</option>
                          <option value={5}>Egyptian General Authority</option>
                          <option value={11}>Majlis Ugama Islam Singapura</option>
                          <option value={12}>JAKIM Malaysia</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest opacity-50 mb-3">Kota</label>
                        <input 
                          type="text" 
                          value={city}
                          onChange={(e) => updateLocation(e.target.value, country)}
                          className="w-full rounded-2xl bg-white/5 border border-white/10 p-6 focus:outline-none focus:border-emerald-500 transition-all text-2xl"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest opacity-50 mb-3">Negara</label>
                        <input 
                          type="text" 
                          value={country}
                          onChange={(e) => updateLocation(city, e.target.value)}
                          className="w-full rounded-2xl bg-white/5 border border-white/10 p-6 focus:outline-none focus:border-emerald-500 transition-all text-2xl"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest opacity-50 mb-3">Tema Jam</label>
                        <select 
                          value={theme}
                          onChange={(e) => updateMasjidSettings(masjidName, runningText, iqomahDuration, adhanFajrUrl, adhanDefaultUrl, enableAdhanAudio, calculationMethod, e.target.value as 'digital' | 'analog')}
                          className="w-full rounded-2xl bg-white/5 border border-white/10 p-6 focus:outline-none focus:border-emerald-500 transition-all text-xl appearance-none"
                        >
                          <option value="digital">Digital</option>
                          <option value="analog">Analog</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-white/5 space-y-6">
                      <div className="flex items-center justify-between">
                        <label className="text-xl font-medium">Layar Penuh (Fullscreen)</label>
                        <button 
                          onClick={toggleFullscreen}
                          className="bg-blue-600 px-8 py-3 rounded-2xl font-bold hover:bg-blue-500 transition-all flex items-center gap-2"
                        >
                          {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                          {isFullscreen ? 'Keluar' : 'Aktifkan'}
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-xl font-medium">Aktifkan Suara Adzan</label>
                        <button 
                          onClick={() => updateMasjidSettings(masjidName, runningText, iqomahDuration, adhanFajrUrl, adhanDefaultUrl, !enableAdhanAudio)}
                          className={`w-20 h-10 rounded-full transition-all relative ${enableAdhanAudio ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                        >
                          <div className={`absolute top-1 w-8 h-8 rounded-full bg-white transition-all ${enableAdhanAudio ? 'right-1' : 'left-1'}`} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-widest opacity-50 mb-3">URL Adzan Subuh</label>
                          <input 
                            type="text" 
                            value={adhanFajrUrl}
                            onChange={(e) => updateMasjidSettings(masjidName, runningText, iqomahDuration, e.target.value, adhanDefaultUrl, enableAdhanAudio)}
                            className="w-full rounded-2xl bg-white/5 border border-white/10 p-4 focus:outline-none focus:border-emerald-500 transition-all text-sm font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-widest opacity-50 mb-3">URL Adzan Lainnya</label>
                          <input 
                            type="text" 
                            value={adhanDefaultUrl}
                            onChange={(e) => updateMasjidSettings(masjidName, runningText, iqomahDuration, adhanFajrUrl, e.target.value, enableAdhanAudio)}
                            className="w-full rounded-2xl bg-white/5 border border-white/10 p-4 focus:outline-none focus:border-emerald-500 transition-all text-sm font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <h3 className="text-4xl font-bold mb-10 flex items-center gap-4">
                    <Clock className="text-amber-500 h-10 w-10" />
                    Koreksi Jadwal (Menit)
                  </h3>
                  <div className="bg-white/5 rounded-3xl p-8 border border-white/10">
                    <p className="text-xs opacity-50 mb-6 italic">Gunakan angka negatif (misal: -2) untuk mempercepat, atau positif (misal: 2) untuk memperlambat.</p>
                    <div className="grid grid-cols-2 gap-6">
                      {prayerNames.map(p => (
                        <div key={p.id} className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-amber-500">{p.label}</label>
                          <input 
                            type="number" 
                            value={prayerOffsets[p.id] || 0}
                            onChange={(e) => {
                              const newOffsets = { ...prayerOffsets, [p.id]: Number(e.target.value) };
                              updateMasjidSettings(masjidName, runningText, iqomahDuration, adhanFajrUrl, adhanDefaultUrl, enableAdhanAudio, calculationMethod, theme, masjidAddress, newOffsets);
                            }}
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 focus:border-amber-500 outline-none text-lg font-bold"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center bg-white/5 rounded-[3rem] p-12 border border-white/5">
                    <div className="flex items-center gap-3 mb-8">
                      <Smartphone className="text-emerald-400 h-8 w-8" />
                      <h4 className="font-bold uppercase tracking-[0.2em] text-lg">Remote Control HP</h4>
                    </div>
                    <div className="bg-white p-6 rounded-[3rem] mb-10 shadow-2xl">
                      <QRCodeSVG value={remoteUrl} size={280} />
                    </div>
                    <p className="text-center text-lg opacity-60 max-w-[300px] leading-relaxed">
                      Scan QR ini untuk mengatur jam dan running text dari HP Pengurus
                    </p>
                    <div className="mt-8 bg-emerald-500/20 px-8 py-3 rounded-full border border-emerald-500/30 flex items-center gap-4">
                      <span className="text-xl font-mono font-bold text-emerald-400">ROOM: {roomId}</span>
                      <button 
                        onClick={copyRemoteLink}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        title="Salin Link Remote"
                      >
                        {copied ? <Check className="h-5 w-5 text-emerald-400" /> : <Copy className="h-5 w-5 text-emerald-400" />}
                      </button>
                    </div>

                    <div className="mt-6 w-full px-8">
                      <label className="block text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2 text-center">Ganti Room ID (Manual)</label>
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          placeholder="Masukkan ID..."
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm font-mono focus:border-emerald-500 outline-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              changeRoomId((e.target as HTMLInputElement).value);
                              (e.target as HTMLInputElement).value = '';
                            }
                          }}
                        />
                        <button 
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                            changeRoomId(input.value);
                            input.value = '';
                          }}
                          className="bg-emerald-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-500 transition-colors"
                        >
                          SET
                        </button>
                      </div>
                      <p className="text-[9px] opacity-40 mt-2 text-center">Berguna untuk vendor mengontrol TV klien dari jarak jauh</p>
                    </div>
                  </div>

                  {/* Auto-Start Instructions */}
                  <div className="mt-12 w-full pt-8 border-t border-white/5">
                    <h5 className="text-amber-400 font-bold uppercase tracking-widest text-sm mb-4 flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Auto-Start (TV Android)
                    </h5>
                    <div className="text-xs opacity-60 space-y-2 leading-relaxed">
                      <p>Agar aplikasi otomatis terbuka saat TV dinyalakan:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Install <b>"Launch on Boot"</b> di Play Store TV.</li>
                        <li>Aktifkan <b>"Enabled"</b> di aplikasi tersebut.</li>
                        <li>Pilih <b>"Browser"</b> sebagai startup app.</li>
                        <li>Masukkan URL aplikasi ini di browser TV.</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setShowSettings(false)}
                className="mt-16 w-full rounded-[2rem] bg-emerald-600 p-8 font-bold text-2xl hover:bg-emerald-500 transition-all shadow-lg"
              >
                Simpan & Tutup
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
}
