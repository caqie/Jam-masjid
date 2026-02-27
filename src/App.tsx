import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Volume2, VolumeX, MapPin, Clock, Settings, Smartphone, Tv, X, RefreshCw, Copy, Check, Maximize, Minimize, Image, Trash2, Plus } from 'lucide-react';
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
  cityId?: string;
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
  digitalFont: string;
}

const AnalogClock = ({ time }: { time: Date }) => {
  const seconds = time.getSeconds();
  const minutes = time.getMinutes();
  const hours = time.getHours();

  const secondDegrees = (seconds / 60) * 360;
  const minuteDegrees = ((minutes + seconds / 60) / 60) * 360;
  const hourDegrees = ((hours % 12 + minutes / 60) / 12) * 360;

  return (
    <div className="relative w-[260px] h-[260px] sm:w-[320px] sm:h-[320px] md:w-[520px] md:h-[520px] rounded-full flex items-center justify-center shadow-[0_0_100px_rgba(0,0,0,0.8),inset_0_0_40px_rgba(0,0,0,0.6)] group [--radius:100px] sm:[--radius:125px] md:[--radius:215px] [--min-radius:110px] sm:[--min-radius:135px] md:[--min-radius:230px]">
      {/* Outer Metallic Bezel */}
      <div className="absolute inset-0 rounded-full border-[8px] sm:border-[12px] border-zinc-800 shadow-[inset_0_2px_10px_rgba(255,255,255,0.2),0_10px_30px_rgba(0,0,0,0.8)]" />
      <div className="absolute inset-[4px] rounded-full border-[1px] sm:border-[2px] border-zinc-700/50" />
      
      {/* Clock Face Background */}
      <div className="absolute inset-[8px] sm:inset-[12px] rounded-full bg-gradient-to-br from-zinc-900 via-black to-zinc-900 overflow-hidden">
        {/* Subtle Radial Pattern */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0%,transparent_70%)]" />
      </div>

      {/* Hour Markers */}
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 sm:w-1.5 md:w-2.5 h-4 sm:h-6 md:h-10 bg-gradient-to-b from-amber-200 to-amber-500 rounded-sm shadow-[0_0_10px_rgba(251,191,36,0.3)]"
          style={{
            transform: `rotate(${i * 30}deg) translateY(calc(-1 * var(--radius)))`,
            transformOrigin: 'center'
          }}
        />
      ))}

      {/* Minute Markers */}
      {[...Array(60)].map((_, i) => i % 5 !== 0 && (
        <div
          key={i}
          className="absolute w-0.5 md:w-1 h-1 sm:h-2 md:h-4 bg-white/20"
          style={{
            transform: `rotate(${i * 6}deg) translateY(calc(-1 * var(--min-radius)))`,
            transformOrigin: 'center'
          }}
        />
      ))}
      
      {/* Hour Hand */}
      <motion.div
        className="absolute top-1/2 left-1/2 w-2 sm:w-3 md:w-5 h-[20%] sm:h-[25%] md:h-[30%] bg-gradient-to-b from-white via-zinc-200 to-zinc-400 rounded-full shadow-2xl z-10"
        animate={{ rotate: hourDegrees }}
        transition={{ type: "spring", stiffness: 50, damping: 20 }}
        style={{
          transformOrigin: 'bottom center',
          x: '-50%',
          y: '-100%'
        }}
      />
      
      {/* Minute Hand */}
      <motion.div
        className="absolute top-1/2 left-1/2 w-1.5 sm:w-2 md:w-3.5 h-[30%] sm:h-[35%] md:h-[42%] bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500 rounded-full shadow-2xl z-20"
        animate={{ rotate: minuteDegrees }}
        transition={{ type: "spring", stiffness: 50, damping: 20 }}
        style={{
          transformOrigin: 'bottom center',
          x: '-50%',
          y: '-100%'
        }}
      />
      
      {/* Second Hand */}
      <motion.div
        className="absolute top-1/2 left-1/2 w-0.5 sm:w-1 md:w-1.5 h-[40%] sm:h-[45%] md:h-[50%] z-30 flex flex-col items-center"
        animate={{ rotate: secondDegrees }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        style={{
          transformOrigin: '50% 85%',
          x: '-50%',
          y: '-85%'
        }}
      >
        <div className="w-full h-[85%] bg-red-600 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.4)]" />
        <div className="w-1.5 sm:w-2 md:w-4 h-[15%] bg-red-800 rounded-full mt-[-1px] sm:mt-[-2px]" />
      </motion.div>
      
      {/* Center Cap */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-zinc-400 via-zinc-800 to-black shadow-2xl z-40 border border-white/10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-zinc-400 z-50" />

      {/* Glass Reflection */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none z-[60]" />
    </div>
  );
};

export default function App() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timings, setTimings] = useState<PrayerTimings | null>(null);
  const [hijriDate, setHijriDate] = useState<string>('');
  const [cityId, setCityId] = useState(() => localStorage.getItem('prayer_city_id') || '1301'); // Default Jakarta
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
  const [digitalFont, setDigitalFont] = useState(() => localStorage.getItem('prayer_digital_font') || 'font-serif');
  const [citySearchResults, setCitySearchResults] = useState<{ id: string, lokasi: string }[]>([]);
  const [isSearchingCity, setIsSearchingCity] = useState(false);
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
  const [activeTab, setActiveTab] = useState<'masjid' | 'jadwal' | 'media' | 'tampilan'>('masjid');
  const [isTVMode, setIsTVMode] = useState(() => localStorage.getItem('prayer_tv_mode') === 'true');
  const [burnInOffset, setBurnInOffset] = useState({ x: 0, y: 0 });
  
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
          console.warn(`${err.name}, ${err.message}`);
        }
      }
    };

    requestWakeLock();

    const handleInteraction = () => {
      if (!wakeLock) requestWakeLock();
      // On TV/Android, try to go fullscreen on first click
      if (!isFullscreen && !isRemoteMode) {
        toggleFullscreen();
      }
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
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, [wakeLock, isFullscreen, isRemoteMode]);

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
      if (settings.digitalFont) setDigitalFont(settings.digitalFont);
      
      if (settings.city) localStorage.setItem('prayer_city', settings.city);
      if (settings.country) localStorage.setItem('prayer_country', settings.country);
      if (settings.isMuted !== undefined) localStorage.setItem('prayer_muted', String(settings.isMuted));
      if (settings.masjidName) localStorage.setItem('prayer_masjid', settings.masjidName);
      if (settings.runningText) localStorage.setItem('prayer_text', settings.runningText);
      if (settings.iqomahDuration) localStorage.setItem('prayer_iqomah', String(settings.iqomahDuration));
      if (settings.masjidAddress) localStorage.setItem('prayer_address', settings.masjidAddress);
      if (settings.prayerOffsets) localStorage.setItem('prayer_offsets', JSON.stringify(settings.prayerOffsets));
      if (settings.mediaList) localStorage.setItem('prayer_media', JSON.stringify(settings.mediaList));
      if (settings.digitalFont) localStorage.setItem('prayer_digital_font', settings.digitalFont);
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
      city, 
      country, 
      isMuted, 
      masjidName, 
      masjidAddress, 
      prayerOffsets, 
      mediaList, 
      runningText, 
      iqomahDuration,
      adhanFajrUrl, 
      adhanDefaultUrl, 
      enableAdhanAudio, 
      calculationMethod,
      theme,
      digitalFont,
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
      const now = new Date();
      setCurrentTime(now);
      
      // Update burn-in offset every minute in TV mode
      if (isTVMode && now.getSeconds() === 0) {
        setBurnInOffset({
          x: (Math.random() - 0.5) * 10, // +/- 5px
          y: (Math.random() - 0.5) * 10
        });
      }
      
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

  // Fetch Kemenag City ID if not set or city changed
  useEffect(() => {
    const findCityId = async () => {
      if (!navigator.onLine) return;
      try {
        const response = await axios.get(`https://api.myquran.com/v2/sholat/kota/cari/${city}`);
        if (response.data.status && response.data.data.length > 0) {
          const id = response.data.data[0].id;
          setCityId(id);
          localStorage.setItem('prayer_city_id', id);
        }
      } catch (error) {
        console.error('Error finding Kemenag city ID:', error);
      }
    };
    findCityId();
  }, [city]);

  // Fetch prayer times
  useEffect(() => {
    const fetchPrayerTimes = async () => {
      const year = currentTime.getFullYear();
      const month = String(currentTime.getMonth() + 1).padStart(2, '0');
      const day = String(currentTime.getDate()).padStart(2, '0');
      const dateStrKemenag = `${year}/${month}/${day}`;
      const dateStrAlAdhan = format(currentTime, 'dd-MM-yyyy');
      const cacheKey = format(currentTime, 'yyyy-MM-dd');

      const cached = localStorage.getItem(`prayer_data_kemenag_${cityId}_${cacheKey}`);
      if (cached) {
        const data = JSON.parse(cached);
        setTimings(data);
      }

      if (!navigator.onLine) return;

      try {
        // Fetch from MyQuran API (Kemenag Mirror)
        const response = await axios.get(`https://api.myquran.com/v2/sholat/jadwal/${cityId}/${dateStrKemenag}`);
        if (response.data.status) {
          const jadwal = response.data.data.jadwal;
          const newTimings: PrayerTimings = {
            Fajr: jadwal.subuh,
            Sunrise: jadwal.terbit,
            Dhuhr: jadwal.dzuhur,
            Asr: jadwal.ashar,
            Maghrib: jadwal.maghrib,
            Isha: jadwal.isya,
            Imsak: jadwal.imsak
          };
          setTimings(newTimings);
          localStorage.setItem(`prayer_data_kemenag_${cityId}_${cacheKey}`, JSON.stringify(newTimings));
        }

        // Also fetch Hijri date from AlAdhan for display
        const hijriResponse = await axios.get(`https://api.aladhan.com/v1/gToH/${dateStrAlAdhan}`);
        const h = hijriResponse.data.data.hijri;
        setHijriDate(`${h.day} ${h.month.en} ${h.year} H`);
      } catch (error) {
        console.error('Error fetching prayer times:', error);
      }
    };

    fetchPrayerTimes();
  }, [cityId, currentTime.getDate()]);

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

  const updateLocation = async (newCity: string, newCountry: string) => {
    setCity(newCity);
    setCountry(newCountry);
    localStorage.setItem('prayer_city', newCity);
    localStorage.setItem('prayer_country', newCountry);
    
    // Search for Kemenag City ID if name is long enough
    if (navigator.onLine && newCity.length >= 3) {
      setIsSearchingCity(true);
      try {
        const response = await axios.get(`https://api.myquran.com/v2/sholat/kota/cari/${newCity}`);
        if (response.data.status && response.data.data.length > 0) {
          setCitySearchResults(response.data.data);
        } else {
          setCitySearchResults([]);
        }
      } catch (error) {
        console.error('Error finding Kemenag city ID:', error);
      } finally {
        setIsSearchingCity(false);
      }
    } else {
      setCitySearchResults([]);
    }
    
    syncSettings({ city: newCity, country: newCountry });
  };

  const selectCity = (id: string, name: string) => {
    setCity(name);
    setCityId(id);
    localStorage.setItem('prayer_city', name);
    localStorage.setItem('prayer_city_id', id);
    setCitySearchResults([]);
    syncSettings({ city: name, cityId: id });
  };

  const updateMasjidSettings = (name: string, text: string, iqomah: number, fajrUrl?: string, defaultUrl?: string, enabled?: boolean, method?: number, newTheme?: 'digital' | 'analog', address?: string, offsets?: Record<string, number>, newMedia?: MediaItem[], newFont?: string) => {
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
    if (newFont !== undefined) setDigitalFont(newFont);

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
    if (newFont !== undefined) localStorage.setItem('prayer_digital_font', newFont);

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
      mediaList: newMedia || mediaList,
      digitalFont: newFont || digitalFont
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
        <header className="sticky top-0 z-50 bg-zinc-900/80 backdrop-blur-2xl border-b border-white/5 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-2.5 rounded-2xl shadow-lg shadow-emerald-500/20">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Masjid Digital</h1>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-500 font-bold">Remote Controller</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-mono bg-white/5 px-3 py-1.5 rounded-full border border-white/10 text-white/60">ID: {roomId}</span>
          </div>
        </header>

        <main className="flex-1 p-6 space-y-8 overflow-y-auto pb-32 custom-scrollbar">
          {/* Live Clock Preview */}
          <section className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-amber-500 rounded-[2.5rem] blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
            <div className="relative bg-zinc-900 rounded-[2.5rem] p-8 border border-white/10 flex flex-col items-center justify-center overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Clock className="h-24 w-24" />
              </div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-500 font-bold mb-2">Live Time</p>
              <h2 className="text-6xl font-mono font-light tracking-tighter text-white">
                {format(currentTime, 'HH:mm')}
                <span className="text-2xl text-emerald-500 ml-2 animate-pulse">{format(currentTime, 'ss')}</span>
              </h2>
              <p className="mt-2 text-xs text-white/40 font-serif italic tracking-widest">{hijriDate}</p>
            </div>
          </section>

          {/* Quick Actions Bento Grid */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Kontrol Cepat</h2>
              <div className="h-px flex-1 bg-white/5 mx-4" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => socket?.emit('trigger-action', { roomId, action: 'play-adhan' })}
                className="bg-emerald-600 aspect-square rounded-[2rem] flex flex-col items-center justify-center gap-3 shadow-xl shadow-emerald-900/20 active:bg-emerald-700 transition-colors relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="bg-white/20 p-4 rounded-2xl">
                  <Volume2 className="h-8 w-8" />
                </div>
                <span className="font-bold text-sm tracking-wide">Tes Adzan</span>
              </motion.button>
              
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => socket?.emit('trigger-action', { roomId, action: 'stop-adhan' })}
                className="bg-zinc-900 aspect-square rounded-[2rem] flex flex-col items-center justify-center gap-3 border border-white/10 active:bg-zinc-800 transition-colors group"
              >
                <div className="bg-white/5 p-4 rounded-2xl group-hover:bg-red-500/20 transition-colors">
                  <X className="h-8 w-8 text-red-500" />
                </div>
                <span className="font-bold text-sm tracking-wide">Stop Adzan</span>
              </motion.button>

              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => socket?.emit('trigger-action', { roomId, action: 'start-iqomah' })}
                className="bg-amber-600 h-24 rounded-[2rem] flex items-center justify-center gap-4 col-span-2 shadow-xl shadow-amber-900/20 active:bg-amber-700 transition-colors group overflow-hidden relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <Clock className="h-6 w-6" />
                <span className="font-bold tracking-wide">Mulai Hitung Mundur Iqomah</span>
              </motion.button>

              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => socket?.emit('trigger-action', { roomId, action: 'skip-iqomah' })}
                className="bg-zinc-900 h-20 rounded-[2rem] flex items-center justify-center gap-4 col-span-2 border border-white/10 active:bg-zinc-800 transition-colors"
              >
                <Minimize className="h-5 w-5 text-amber-500" />
                <span className="font-bold text-sm tracking-wide">Lewati Iqomah</span>
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

          {/* Media Carousel Section */}
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 ml-1">Media Carousel (Gambar/Video)</h2>
            <div className="bg-zinc-900 rounded-[2rem] p-6 border border-white/5 space-y-5">
              <div className="space-y-3">
                {mediaList.map((item, index) => (
                  <div key={index} className="flex gap-3 items-center bg-white/5 p-3 rounded-2xl border border-white/5">
                    <div className="flex-1 min-w-0">
                      <p className="text-[8px] font-bold uppercase tracking-widest text-emerald-500 mb-0.5">{item.type}</p>
                      <p className="text-[10px] font-mono truncate opacity-40">{item.url}</p>
                    </div>
                    <button 
                      onClick={() => {
                        const newList = mediaList.filter((_, i) => i !== index);
                        updateMasjidSettings(masjidName, runningText, iqomahDuration, adhanFajrUrl, adhanDefaultUrl, enableAdhanAudio, calculationMethod, theme, masjidAddress, prayerOffsets, newList);
                      }}
                      className="p-2 bg-red-500/10 text-red-400 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="pt-4 border-t border-white/5 space-y-3">
                <div className="flex gap-2">
                  <select 
                    id="remote-media-type"
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:border-emerald-500 outline-none"
                  >
                    <option value="image">Gambar</option>
                    <option value="video">Video</option>
                  </select>
                  <input 
                    id="remote-media-url"
                    type="text" 
                    placeholder="URL Media..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:border-emerald-500 outline-none"
                  />
                </div>
                <button 
                  onClick={() => {
                    const type = (document.getElementById('remote-media-type') as HTMLSelectElement).value as 'image' | 'video';
                    const url = (document.getElementById('remote-media-url') as HTMLInputElement).value;
                    if (url) {
                      const newList = [...mediaList, { type, url }];
                      updateMasjidSettings(masjidName, runningText, iqomahDuration, adhanFajrUrl, adhanDefaultUrl, enableAdhanAudio, calculationMethod, theme, masjidAddress, prayerOffsets, newList);
                      (document.getElementById('remote-media-url') as HTMLInputElement).value = '';
                    }
                  }}
                  className="w-full bg-emerald-600 py-3 rounded-xl font-bold text-sm hover:bg-emerald-500 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Media
                </button>
              </div>
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
    <div className="relative h-screen w-full overflow-hidden bg-[#050505] text-white font-sans flex flex-col">
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

      {/* Header Section */}
      <header className="relative z-10 flex-none flex items-center justify-between p-6 md:p-8">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <h2 className="text-3xl md:text-5xl font-serif font-medium tracking-tight text-amber-200 drop-shadow-[0_2px_10px_rgba(251,191,36,0.3)]">
              {masjidName}
            </h2>
            <p className="text-base md:text-lg font-serif italic text-white/60 mt-1">
              {masjidAddress}
            </p>
          </div>
          {isOffline && (
            <div className="flex items-center gap-2 bg-red-500/20 px-4 py-1.5 rounded-full border border-red-500/30 backdrop-blur-md">
              <RefreshCw className="h-3 w-3 text-red-400 animate-spin" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">Offline</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end mr-4">
             <p className="text-xl md:text-2xl font-serif italic text-amber-200/80 tracking-[0.2em] uppercase">
                {format(currentTime, 'EEEE', { locale: id })}
             </p>
             <p className="text-lg md:text-xl font-serif font-light text-white/90 tracking-[0.1em]">
               {format(currentTime, 'd MMMM yyyy', { locale: id })}
             </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleFullscreen}
              className="rounded-full bg-white/5 p-3 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all group"
              title={isFullscreen ? "Keluar Fullscreen" : "Masuk Fullscreen"}
            >
              {isFullscreen ? <Minimize className="h-5 w-5 text-amber-400" /> : <Maximize className="h-5 w-5 text-amber-400 group-hover:scale-110 transition-transform" />}
            </button>
            <button 
              onClick={toggleMute}
              className="rounded-full bg-white/5 p-3 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all group"
            >
              {isMuted ? <VolumeX className="h-5 w-5 text-red-400" /> : <Volume2 className="h-5 w-5 text-amber-400 group-hover:scale-110 transition-transform" />}
            </button>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="rounded-full bg-white/5 p-3 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all"
            >
              <Settings className="h-5 w-5 text-white/80" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center lg:justify-between px-4 sm:px-6 md:px-12 gap-4 sm:gap-6 lg:gap-12 min-h-0 overflow-hidden">
        {/* Left Side: Clock & Hijri */}
        <div 
          className="flex-1 flex flex-col items-center justify-center w-full min-h-0 transition-all duration-[10000ms] ease-in-out"
          style={{ 
            transform: isTVMode ? `translate(${burnInOffset.x}px, ${burnInOffset.y}px)` : 'none' 
          }}
        >
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center w-full"
          >
            {theme === 'digital' ? (
              <div className="flex flex-col items-center">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 md:gap-8">
                  <h1 className={`text-[4.5rem] sm:text-[6rem] md:text-[10rem] lg:text-[12rem] xl:text-[14rem] ${digitalFont} font-light tracking-tighter leading-none text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]`}>
                    {format(currentTime, 'HH:mm')}
                  </h1>
                  <div className="flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-xl md:rounded-[2rem] px-3 py-1.5 md:px-6 md:py-4 backdrop-blur-md">
                    <span className="text-xl sm:text-2xl md:text-5xl text-amber-500 font-mono font-bold leading-none animate-pulse">
                      {format(currentTime, 'ss')}
                    </span>
                    <span className="text-[7px] md:text-xs uppercase tracking-[0.3em] opacity-30 font-sans font-bold mt-0.5 md:mt-2">Detik</span>
                  </div>
                </div>
                {hijriDate && (
                  <p className="text-base sm:text-xl md:text-3xl font-serif italic text-amber-200/60 tracking-[0.2em] mt-2 sm:mt-4 md:mt-8">
                    {hijriDate}
                  </p>
                )}
              </div>
            ) : (
              <div className="scale-[0.45] sm:scale-75 md:scale-90 lg:scale-100 origin-center">
                <AnalogClock time={currentTime} />
                {hijriDate && (
                  <p className="text-lg sm:text-xl md:text-3xl font-serif italic text-amber-200/60 tracking-[0.2em] mt-4 md:mt-8">
                    {hijriDate}
                  </p>
                )}
              </div>
            )}
          </motion.div>

          {nextPrayer && !isIqomahCountdown && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 sm:mt-4 md:mt-8 flex items-center gap-2 md:gap-6 rounded-full bg-white/5 px-4 py-1.5 md:px-10 md:py-4 backdrop-blur-2xl border border-white/10"
            >
              <Clock className="h-3 w-3 md:h-4 md:w-4 text-amber-400" />
              <span className="text-[10px] sm:text-sm md:text-xl font-light tracking-[0.1em] uppercase">
                Menuju <span className="text-amber-300 font-medium">{nextPrayer.label}</span> <span className="opacity-40 mx-1 md:mx-2">—</span> {nextPrayer.time}
              </span>
            </motion.div>
          )}
        </div>

        {/* Right Side: Media Carousel */}
        <div className="flex-1 w-full h-full max-h-[25vh] sm:max-h-[30vh] lg:max-h-[60vh] flex items-center justify-center py-1 lg:py-4">
          {mediaList.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full h-full aspect-video rounded-xl md:rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl relative bg-black/40 backdrop-blur-md"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentMediaIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8 }}
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </motion.div>
              </AnimatePresence>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                {mediaList.map((_, idx) => (
                  <div key={idx} className={`h-1 rounded-full transition-all duration-500 ${idx === currentMediaIndex ? 'w-6 bg-amber-400' : 'w-1.5 bg-white/20'}`} />
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Footer Section: Prayer Times & Running Text */}
      <footer className="relative z-10 flex-none p-2 sm:p-4 md:p-8 space-y-2 sm:space-y-4 md:space-y-6">
        {/* Source Badge */}
        <div className="flex justify-end px-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[8px] sm:text-[10px] uppercase tracking-widest text-white/40 font-medium">Sumber: Bimas Islam Kemenag RI</span>
          </div>
        </div>
        {/* Prayer Times Grid - Horizontal Scroll on Mobile */}
        <div className="flex lg:grid lg:grid-cols-7 gap-2 sm:gap-3 md:gap-6 overflow-x-auto lg:overflow-x-visible no-scrollbar pb-2 lg:pb-0 px-2 sm:px-0">
          {prayerNames.map((prayer) => {
            const time = adjustedTimings ? adjustedTimings[prayer.id as keyof PrayerTimings] : '--:--';
            const isNext = nextPrayer?.name === prayer.id;
            
            return (
              <div
                key={prayer.id}
                className={`relative flex-none w-[100px] sm:w-[140px] lg:w-auto overflow-hidden rounded-xl md:rounded-[1.5rem] p-2 sm:p-3 md:p-6 backdrop-blur-3xl border transition-all duration-500 ${
                  isNext 
                    ? 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_40px_rgba(251,191,36,0.2)]' 
                    : 'bg-white/5 border-white/5'
                }`}
              >
                <p className="text-[10px] sm:text-xs md:text-base font-serif italic tracking-[0.1em] opacity-60 mb-0.5 sm:mb-1 md:mb-2 text-amber-50/80">
                  {prayer.label}
                </p>
                <p className="text-base sm:text-xl md:text-4xl lg:text-5xl font-serif font-light tracking-tighter text-white">
                  {time}
                </p>
                {isNext && (
                  <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 md:top-4 md:right-4">
                    <div className="h-1 w-1 sm:h-1.5 sm:w-1.5 md:h-2 md:w-2 rounded-full bg-amber-400 animate-pulse" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Running Text */}
        <div className="bg-black/40 backdrop-blur-xl border border-white/5 py-2 sm:py-3 md:py-4 rounded-lg md:rounded-2xl overflow-hidden">
          <div className="whitespace-nowrap animate-marquee inline-block">
            <span className="text-sm sm:text-lg md:text-3xl font-serif italic tracking-wider mx-12 text-amber-100/80">
              {runningText} <span className="mx-8 opacity-30">❈</span> {runningText} <span className="mx-8 opacity-30">❈</span> {runningText}
            </span>
          </div>
        </div>

        {/* Creator Credit */}
        <div className="flex justify-center opacity-20">
          <p className="text-[8px] uppercase tracking-[0.4em] font-serif italic text-amber-200">
            Created by caqiestudioproduction
          </p>
        </div>
      </footer>

      {/* Overlays */}
      <AnimatePresence>
        {isIqomahCountdown && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#050505] overflow-hidden"
          >
            {/* Cinematic Background */}
            <div className="absolute inset-0 z-0">
              <img 
                src="https://images.unsplash.com/photo-1542810634-71277d95dcbb?q=80&w=2070" 
                className="w-full h-full object-cover opacity-20 scale-110 blur-sm" 
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]" />
            </div>
            
            <div className="relative z-10 flex flex-col items-center w-full max-w-4xl px-6">
              {/* Header Label */}
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mb-12 text-center"
              >
                <h2 className="text-4xl md:text-6xl font-serif italic tracking-[0.5em] text-amber-500 uppercase drop-shadow-[0_0_20px_rgba(251,191,36,0.5)]">
                  Menuju Iqomah
                </h2>
                <div className="h-px w-32 bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto mt-6 opacity-50" />
              </motion.div>

              {/* Progress Ring & Timer */}
              <div className="relative flex items-center justify-center">
                <svg className="w-[350px] h-[350px] md:w-[550px] md:h-[550px] -rotate-90">
                  <circle
                    cx="50%"
                    cy="50%"
                    r="46%"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="transparent"
                    className="text-white/5"
                  />
                  <motion.circle
                    cx="50%"
                    cy="50%"
                    r="46%"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="transparent"
                    strokeDasharray="100 100"
                    initial={{ pathLength: 1 }}
                    animate={{ pathLength: iqomahTimeLeft / (iqomahDuration * 60) }}
                    transition={{ duration: 1, ease: "linear" }}
                    className="text-amber-500"
                    strokeLinecap="round"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-[10rem] md:text-[16rem] font-serif font-light leading-none text-white drop-shadow-[0_0_60px_rgba(255,255,255,0.1)] flex items-baseline">
                    <span>{Math.floor(iqomahTimeLeft / 60)}</span>
                    <span className="text-[6rem] md:text-[10rem] opacity-20 mx-2">:</span>
                    <span>{(iqomahTimeLeft % 60).toString().padStart(2, '0')}</span>
                  </div>
                </div>
              </div>

              {/* Footer Message */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-16 text-center"
              >
                <p className="text-2xl md:text-4xl font-serif italic text-white/80 tracking-widest">
                  Luruskan dan Rapatkan Shaf
                </p>
                <p className="mt-4 text-sm md:text-lg font-serif italic text-amber-200/40 tracking-[0.3em] uppercase">
                  Mohon matikan alat komunikasi
                </p>
              </motion.div>
            </div>

            {/* Skip Button */}
            <motion.button 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              whileHover={{ opacity: 1, scale: 1.05 }}
              onClick={() => setIsIqomahCountdown(false)}
              className="absolute bottom-12 rounded-full border border-white/10 bg-white/5 px-10 py-3 text-sm font-serif italic tracking-widest hover:bg-amber-500 hover:text-black transition-all z-20"
            >
              Lewati Hitung Mundur
            </motion.button>

            {/* Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black to-transparent opacity-60" />
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black to-transparent opacity-60" />
          </motion.div>
        )}
      </AnimatePresence>

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
            className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6"
          >
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowSettings(false)} />
            <div className="relative w-full h-full sm:w-[98vw] md:w-[95vw] max-w-7xl sm:h-[95vh] md:h-[90vh] sm:rounded-[2rem] md:rounded-[3rem] bg-zinc-900 border-0 sm:border border-white/10 shadow-2xl overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="flex-none p-6 sm:p-10 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="bg-emerald-500 p-2 sm:p-3 rounded-xl sm:rounded-2xl">
                    <Settings className="text-white h-6 w-6 sm:h-8 sm:w-8" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-3xl font-bold">Panel Admin Masjid</h3>
                    <p className="text-[8px] sm:text-sm opacity-40 uppercase tracking-widest">Pengaturan Sistem & Kontrol Display</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="p-3 sm:p-4 rounded-full bg-white/5 hover:bg-white/10 transition-all"
                >
                  <X className="h-6 w-6 sm:h-8 sm:w-8" />
                </button>
              </div>

              <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
                {/* Sidebar Tabs / Top Nav on Mobile */}
                <div className="w-full sm:w-80 border-b sm:border-b-0 sm:border-r border-white/5 p-4 sm:p-8 flex flex-row sm:flex-col overflow-x-auto sm:overflow-x-visible space-y-0 sm:space-y-2 gap-2 sm:gap-0 no-scrollbar">
                  {[
                    { id: 'masjid', label: 'Identitas', icon: Tv },
                    { id: 'jadwal', label: 'Jadwal', icon: Clock },
                    { id: 'media', label: 'Media', icon: Image },
                    { id: 'tampilan', label: 'Tampilan', icon: Settings },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex-none sm:w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl transition-all ${
                        activeTab === tab.id 
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                          : 'hover:bg-white/5 text-white/60'
                      }`}
                    >
                      <tab.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="font-bold text-[10px] sm:text-sm uppercase tracking-widest whitespace-nowrap">{tab.label}</span>
                    </button>
                  ))}

                  <div className="hidden sm:block pt-10">
                    <div className="bg-white/5 rounded-3xl p-6 border border-white/5 flex flex-col items-center">
                      <QRCodeSVG value={remoteUrl} size={150} />
                      <p className="mt-4 text-[10px] text-center opacity-40 uppercase tracking-widest font-bold">Remote Control HP</p>
                      <div className="mt-4 flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
                        <span className="text-xs font-mono font-bold text-emerald-400">{roomId}</span>
                        <button onClick={copyRemoteLink} className="text-emerald-400">
                          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-12 custom-scrollbar">
                  {activeTab === 'masjid' && (
                    <div className="space-y-6 sm:space-y-8 max-w-4xl">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500 mb-2 sm:mb-3">Nama Masjid/Mushola</label>
                          <input 
                            type="text" 
                            value={masjidName}
                            onChange={(e) => updateMasjidSettings(e.target.value, runningText, iqomahDuration, adhanFajrUrl, adhanDefaultUrl, enableAdhanAudio, calculationMethod, theme, masjidAddress, prayerOffsets, mediaList, digitalFont)}
                            className="w-full rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-5 focus:outline-none focus:border-emerald-500 transition-all text-lg sm:text-xl"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500 mb-2 sm:mb-3">Alamat Masjid</label>
                          <input 
                            type="text" 
                            value={masjidAddress}
                            onChange={(e) => updateMasjidSettings(masjidName, runningText, iqomahDuration, adhanFajrUrl, adhanDefaultUrl, enableAdhanAudio, calculationMethod, theme, e.target.value, prayerOffsets, mediaList, digitalFont)}
                            className="w-full rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-5 focus:outline-none focus:border-emerald-500 transition-all text-base sm:text-lg"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500 mb-2 sm:mb-3">Running Text (Pengumuman)</label>
                          <textarea 
                            value={runningText}
                            onChange={(e) => updateMasjidSettings(masjidName, e.target.value, iqomahDuration, adhanFajrUrl, adhanDefaultUrl, enableAdhanAudio, calculationMethod, theme, masjidAddress, prayerOffsets, mediaList, digitalFont)}
                            className="w-full rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-5 focus:outline-none focus:border-emerald-500 transition-all text-base sm:text-lg h-24 sm:h-32 resize-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500 mb-2 sm:mb-3">Jeda Iqomah (Menit)</label>
                          <input 
                            type="number" 
                            value={iqomahDuration}
                            onChange={(e) => updateMasjidSettings(masjidName, runningText, Number(e.target.value), adhanFajrUrl, adhanDefaultUrl, enableAdhanAudio, calculationMethod, theme, masjidAddress, prayerOffsets, mediaList, digitalFont)}
                            className="w-full rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-5 focus:outline-none focus:border-emerald-500 transition-all text-lg sm:text-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500 mb-2 sm:mb-3">Metode Perhitungan</label>
                          <select 
                            value={calculationMethod}
                            onChange={(e) => updateMasjidSettings(masjidName, runningText, iqomahDuration, adhanFajrUrl, adhanDefaultUrl, enableAdhanAudio, Number(e.target.value), theme, masjidAddress, prayerOffsets, mediaList, digitalFont)}
                            className="w-full rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-5 focus:outline-none focus:border-emerald-500 transition-all text-base sm:text-lg appearance-none"
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
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500 mb-2 sm:mb-3">Kota (Bimas Islam)</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              value={city}
                              onChange={(e) => updateLocation(e.target.value, country)}
                              className="w-full rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-5 focus:outline-none focus:border-emerald-500 transition-all text-lg sm:text-xl"
                              placeholder="Cari kota..."
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                              {isSearchingCity && <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />}
                              <div className="text-[10px] text-emerald-500/50 font-mono">
                                ID: {cityId}
                              </div>
                            </div>

                            {/* City Search Results Dropdown */}
                            {citySearchResults.length > 0 && (
                              <div className="absolute z-[100] top-full left-0 right-0 mt-2 bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl max-h-60 overflow-y-auto no-scrollbar">
                                {citySearchResults.map((result) => (
                                  <button
                                    key={result.id}
                                    onClick={() => selectCity(result.id, result.lokasi)}
                                    className="w-full text-left px-5 py-4 hover:bg-emerald-500/10 transition-colors border-b border-white/5 last:border-0"
                                  >
                                    <p className="text-white font-medium">{result.lokasi}</p>
                                    <p className="text-[10px] text-emerald-500/50 font-mono">ID: {result.id}</p>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] text-white/30 italic mt-2">Ketik nama kota dan pilih dari daftar untuk sinkronisasi Bimas Islam.</p>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500 mb-2 sm:mb-3">Negara</label>
                          <input 
                            type="text" 
                            value={country}
                            onChange={(e) => updateLocation(city, e.target.value)}
                            className="w-full rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-5 focus:outline-none focus:border-emerald-500 transition-all text-lg sm:text-xl"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'jadwal' && (
                    <div className="space-y-6 sm:space-y-8 max-w-4xl">
                      <div className="bg-amber-500/10 border border-amber-500/20 p-4 sm:p-6 rounded-2xl sm:rounded-3xl mb-6 sm:mb-8">
                        <p className="text-xs sm:text-sm text-amber-200 leading-relaxed">
                          Gunakan koreksi jadwal jika waktu sholat otomatis tidak sesuai dengan jadwal lokal. 
                          Gunakan angka negatif (misal: -2) untuk mempercepat, atau positif (misal: 2) untuk memperlambat.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        {prayerNames.map(p => (
                          <div key={p.id} className="bg-white/5 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/5 flex items-center justify-between">
                            <span className="font-bold uppercase tracking-widest text-xs sm:text-sm text-amber-500">{p.label}</span>
                            <div className="flex items-center gap-3 sm:gap-4">
                              <input 
                                type="number" 
                                value={prayerOffsets[p.id] || 0}
                                onChange={(e) => {
                                  const newOffsets = { ...prayerOffsets, [p.id]: Number(e.target.value) };
                                  updateMasjidSettings(masjidName, runningText, iqomahDuration, adhanFajrUrl, adhanDefaultUrl, enableAdhanAudio, calculationMethod, theme, masjidAddress, newOffsets, mediaList, digitalFont);
                                }}
                                className="w-20 sm:w-24 bg-black/40 border border-white/10 rounded-xl p-2 sm:p-3 focus:border-amber-500 outline-none text-center font-bold text-lg sm:text-xl"
                              />
                              <span className="text-[8px] sm:text-[10px] opacity-40 font-bold uppercase">Menit</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'media' && (
                    <div className="space-y-6 sm:space-y-8 max-w-4xl">
                      <div className="grid grid-cols-1 gap-4">
                        {mediaList.map((item, index) => (
                          <div key={index} className="flex gap-4 sm:gap-6 items-center bg-white/5 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/5 group">
                            <div className="h-16 w-24 sm:h-20 sm:w-32 rounded-lg sm:rounded-xl overflow-hidden bg-black flex-none">
                              {item.type === 'image' ? (
                                <img src={item.url} className="w-full h-full object-cover opacity-60" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-emerald-500/20">
                                  <Tv className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-500" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-1">{item.type}</p>
                              <p className="text-xs sm:text-sm font-mono truncate opacity-40">{item.url}</p>
                            </div>
                            <button 
                              onClick={() => {
                                const newList = mediaList.filter((_, i) => i !== index);
                                updateMasjidSettings(masjidName, runningText, iqomahDuration, adhanFajrUrl, adhanDefaultUrl, enableAdhanAudio, calculationMethod, theme, masjidAddress, prayerOffsets, newList, digitalFont);
                              }}
                              className="p-3 sm:p-4 bg-red-500/10 text-red-400 rounded-xl sm:rounded-2xl hover:bg-red-500 hover:text-white transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                            >
                              <Trash2 className="h-5 w-5 sm:h-6 sm:w-6" />
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      <div className="pt-6 sm:pt-10 border-t border-white/5">
                        <h4 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6">Tambah Media Baru</h4>
                        <div className="flex flex-col sm:flex-row gap-4 bg-white/5 p-4 sm:p-6 rounded-2xl sm:rounded-[2.5rem] border border-white/5">
                          <select 
                            id="new-media-type"
                            className="w-full sm:w-auto bg-zinc-800 border border-white/10 rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-sm focus:border-emerald-500 outline-none appearance-none"
                          >
                            <option value="image">Gambar</option>
                            <option value="video">Video</option>
                          </select>
                          <input 
                            id="new-media-url"
                            type="text" 
                            placeholder="URL Media (https://...)"
                            className="flex-1 bg-zinc-800 border border-white/10 rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-sm focus:border-emerald-500 outline-none"
                          />
                          <button 
                            onClick={() => {
                              const type = (document.getElementById('new-media-type') as HTMLSelectElement).value as 'image' | 'video';
                              const url = (document.getElementById('new-media-url') as HTMLInputElement).value;
                              if (url) {
                                const newList = [...mediaList, { type, url }];
                                updateMasjidSettings(masjidName, runningText, iqomahDuration, adhanFajrUrl, adhanDefaultUrl, enableAdhanAudio, calculationMethod, theme, masjidAddress, prayerOffsets, newList, digitalFont);
                                (document.getElementById('new-media-url') as HTMLInputElement).value = '';
                              }
                            }}
                            className="w-full sm:w-auto bg-emerald-600 px-6 sm:px-10 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold hover:bg-emerald-500 transition-all flex items-center justify-center gap-2"
                          >
                            <Plus className="h-5 w-5" />
                            <span className="uppercase tracking-widest text-xs sm:text-sm">Tambah</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'tampilan' && (
                    <div className="space-y-8 sm:space-y-10 max-w-4xl">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500 mb-3">Tema Jam Utama</label>
                          <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            {['digital', 'analog'].map((t) => (
                              <button
                                key={t}
                                onClick={() => updateMasjidSettings(masjidName, runningText, iqomahDuration, adhanFajrUrl, adhanDefaultUrl, enableAdhanAudio, calculationMethod, t as any, masjidAddress, prayerOffsets, mediaList, digitalFont)}
                                className={`py-3 sm:py-4 rounded-xl sm:rounded-2xl border transition-all font-bold uppercase tracking-widest text-[10px] sm:text-xs ${
                                  theme === t ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white/5 border-white/10 text-white/40'
                                }`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500 mb-3">Font Jam Digital</label>
                          <select 
                            value={digitalFont}
                            onChange={(e) => updateMasjidSettings(masjidName, runningText, iqomahDuration, adhanFajrUrl, adhanDefaultUrl, enableAdhanAudio, calculationMethod, theme, masjidAddress, prayerOffsets, mediaList, e.target.value)}
                            className="w-full rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-5 focus:outline-none focus:border-emerald-500 transition-all text-base sm:text-lg appearance-none"
                          >
                            <option value="font-serif">Cormorant (Serif)</option>
                            <option value="font-sans">Inter (Sans)</option>
                            <option value="font-mono">JetBrains (Mono)</option>
                            <option value="font-digital">Orbitron (Digital)</option>
                            <option value="font-bebas">Bebas Neue (Bold)</option>
                          </select>
                        </div>
                      </div>

                      <div className="pt-6 sm:pt-10 border-t border-white/5 space-y-6 sm:space-y-8">
                        <div className="flex items-center justify-between bg-white/5 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/5">
                          <div>
                            <p className="font-bold text-base sm:text-lg">TV Mode (Kiosk)</p>
                            <p className="text-[10px] sm:text-xs opacity-40">Optimalkan untuk Smart TV (Auto-fullscreen & Always On)</p>
                            {isTVMode && (
                              <div className="mt-2 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                <p className="text-[9px] text-emerald-400 leading-relaxed uppercase tracking-wider font-bold">
                                  Tips: Gunakan aplikasi "Launch on Boot" di Android TV Store agar aplikasi ini otomatis terbuka saat TV dinyalakan.
                                </p>
                              </div>
                            )}
                          </div>
                          <button 
                            onClick={() => {
                              const newVal = !isTVMode;
                              setIsTVMode(newVal);
                              localStorage.setItem('prayer_tv_mode', String(newVal));
                              if (newVal) toggleFullscreen();
                            }}
                            className={`w-16 sm:w-20 h-8 sm:h-10 rounded-full transition-all relative ${isTVMode ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                          >
                            <div className={`absolute top-1 w-6 sm:w-8 h-6 sm:h-8 rounded-full bg-white transition-all ${isTVMode ? 'right-1' : 'left-1'}`} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between bg-white/5 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/5">
                          <div>
                            <p className="font-bold text-base sm:text-lg">Suara Adzan Otomatis</p>
                            <p className="text-[10px] sm:text-xs opacity-40">Putar audio saat waktu sholat tiba</p>
                          </div>
                          <button 
                            onClick={() => updateMasjidSettings(masjidName, runningText, iqomahDuration, adhanFajrUrl, adhanDefaultUrl, !enableAdhanAudio, calculationMethod, theme, masjidAddress, prayerOffsets, mediaList, digitalFont)}
                            className={`w-16 sm:w-20 h-8 sm:h-10 rounded-full transition-all relative ${enableAdhanAudio ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                          >
                            <div className={`absolute top-1 w-6 sm:w-8 h-6 sm:h-8 rounded-full bg-white transition-all ${enableAdhanAudio ? 'right-1' : 'left-1'}`} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500 mb-2 sm:mb-3">URL Adzan Subuh</label>
                            <input 
                              type="text" 
                              value={adhanFajrUrl}
                              onChange={(e) => updateMasjidSettings(masjidName, runningText, iqomahDuration, e.target.value, adhanDefaultUrl, enableAdhanAudio, calculationMethod, theme, masjidAddress, prayerOffsets, mediaList, digitalFont)}
                              className="w-full rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-3 sm:p-4 focus:outline-none focus:border-emerald-500 transition-all text-[10px] sm:text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500 mb-2 sm:mb-3">URL Adzan Lainnya</label>
                            <input 
                              type="text" 
                              value={adhanDefaultUrl}
                              onChange={(e) => updateMasjidSettings(masjidName, runningText, iqomahDuration, adhanFajrUrl, e.target.value, enableAdhanAudio, calculationMethod, theme, masjidAddress, prayerOffsets, mediaList, digitalFont)}
                              className="w-full rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-3 sm:p-4 focus:outline-none focus:border-emerald-500 transition-all text-[10px] sm:text-xs font-mono"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between bg-white/5 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/5">
                          <div>
                            <p className="font-bold text-base sm:text-lg">Layar Penuh (Fullscreen)</p>
                            <p className="text-[10px] sm:text-xs opacity-40">Optimalkan tampilan untuk TV</p>
                          </div>
                          <button 
                            onClick={toggleFullscreen}
                            className="bg-blue-600 px-6 sm:px-10 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold hover:bg-blue-500 transition-all flex items-center gap-2 sm:gap-3"
                          >
                            {isFullscreen ? <Minimize className="h-4 w-4 sm:h-5 sm:w-5" /> : <Maximize className="h-4 w-4 sm:h-5 sm:w-5" />}
                            <span className="uppercase tracking-widest text-[10px] sm:text-sm">{isFullscreen ? 'Keluar' : 'Aktifkan'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button 
                onClick={() => setShowSettings(false)}
                className="flex-none w-full bg-emerald-600 p-6 sm:p-8 font-bold text-xl sm:text-2xl hover:bg-emerald-500 transition-all shadow-lg uppercase tracking-widest"
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
