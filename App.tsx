
import React, { useState, useEffect } from 'react';
import { Game, Achievement, Platform, UserSession } from './types';
import { translations, Language } from './translations';
import { fetchSteamData, fetchGameAchievements } from './services/steamService';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import GameDetail from './components/GameDetail';
import Settings from './components/Settings';
import RoutePlanner from './components/RoutePlanner';
import AchievementsView from './components/AchievementsView';
import { CpuChipIcon } from '@heroicons/react/24/solid';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [language, setLanguage] = useState<Language>('de');
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStage, setSyncStage] = useState('');
  const [games, setGames] = useState<Game[]>([]);
  const [achievements, setAchievements] = useState<Record<string, Achievement[]>>({});
  const [session, setSession] = useState<UserSession | null>(null);

  const t = translations[language] || translations['de'];

  useEffect(() => {
    const savedSession = localStorage.getItem('thp_session');
    if (savedSession) {
      const parsed = JSON.parse(savedSession);
      setSession(parsed);
      loadUserData(parsed);
    }
  }, []);

  const loadUserData = async (currentSession: UserSession) => {
    if (!currentSession.apiKey || !currentSession.userId) return false;
    
    setIsSyncing(true);
    const stages = [t.sync_stages.s1, t.sync_stages.s2, t.sync_stages.s3, t.sync_stages.s4, t.sync_stages.s5];

    try {
      for (const stage of stages) {
        setSyncStage(stage);
        await new Promise(r => setTimeout(r, 300));
      }

      const data = await fetchSteamData(currentSession.apiKey, currentSession.userId);
      
      let fetchedGames: Game[] = data.games.map((g: any) => ({
        id: `steam_${g.appid}`,
        title: g.name,
        platform: 'Steam' as Platform,
        coverUrl: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${g.appid}/header.jpg`,
        completionRate: 0, 
        totalAchievements: 0,
        unlockedAchievements: 0,
        lastPlayed: new Date().toISOString()
      }));

      const achievementsMap: Record<string, Achievement[]> = {};
      
      // Für ein akkurates Ranking laden wir die Stats der meistgespielten Spiele
      // In einer Real-World App würde man dies paginieren oder im Hintergrund machen
      const topGames = fetchedGames.slice(0, 15);
      
      for (const game of topGames) {
        const appId = game.id.replace('steam_', '');
        try {
          const achs = await fetchGameAchievements(currentSession.apiKey, currentSession.userId, appId);
          achievementsMap[game.id] = achs;
          
          const unlockedCount = achs.filter((a: any) => a.isUnlocked).length;
          game.totalAchievements = achs.length;
          game.unlockedAchievements = unlockedCount;
          game.completionRate = achs.length > 0 ? Math.round((unlockedCount / achs.length) * 100) : 0;
        } catch (e) {
          console.warn(`Could not load achievements for ${game.title}`);
        }
      }

      // Sortierung nach Abschlussrate: Höchste zuerst
      fetchedGames.sort((a, b) => b.completionRate - a.completionRate);

      setGames(fetchedGames);
      setAchievements(achievementsMap);
      
      const updatedSession = {
        ...currentSession,
        displayName: data.player.personaname,
        avatarUrl: data.player.avatarfull
      };
      setSession(updatedSession);
      localStorage.setItem('thp_session', JSON.stringify(updatedSession));
      
      return true;
    } catch (err) {
      console.error(err);
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogin = async (apiKey: string, steamId: string) => {
    const newSession: UserSession = {
      platforms: { 'Steam': true },
      expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
      userId: steamId,
      apiKey: apiKey,
      displayName: 'Operator',
      avatarUrl: ''
    };
    const success = await loadUserData(newSession);
    if (success) setActiveTab('dashboard');
    return success;
  };

  const handleLogout = () => {
    setSession(null);
    setGames([]);
    setAchievements({});
    localStorage.removeItem('thp_session');
    setActiveTab('settings');
  };

  const navigateToGame = async (id: string) => {
    if (!achievements[id] && session) {
      setIsSyncing(true);
      setSyncStage(t.sync_stages.s4);
      const appId = id.replace('steam_', '');
      const achs = await fetchGameAchievements(session.apiKey, session.userId, appId);
      setAchievements(prev => ({ ...prev, [id]: achs }));
      setIsSyncing(false);
    }
    setSelectedGameId(id);
    setActiveTab('game-detail');
  };

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      isSyncing={isSyncing} 
      onSync={() => session && loadUserData(session)}
      language={language}
      setLanguage={setLanguage}
      session={session}
    >
      {isSyncing ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-12 animate-in fade-in h-full">
           <div className="relative">
              <div className="w-28 h-28 border-t-2 border-amber-500 rounded-full animate-spin"></div>
              <CpuChipIcon className="w-12 h-12 text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-[0_0_30px_rgba(245,158,11,0.6)]" />
           </div>
           <p className="text-amber-500 font-black uppercase tracking-[0.5em] text-[11px] italic">{syncStage}</p>
        </div>
      ) : activeTab === 'library' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-24 animate-in fade-in">
          {games.length === 0 ? (
            <div className="col-span-full py-32 text-center text-zinc-700 font-black uppercase tracking-[0.3em] text-[10px]">Library_Empty_Initialize_Link</div>
          ) : (
            games.map(g => (
              <div 
                key={g.id} 
                onClick={() => navigateToGame(g.id)} 
                className={`
                  bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden active:scale-[0.98] transition-all flex items-center p-6 gap-6 hover:border-amber-500/30 group shadow-2xl relative
                  ${g.completionRate >= 80 && g.completionRate < 100 ? 'near-complete-pulse' : ''}
                  ${g.completionRate === 100 ? 'border-green-500/50' : ''}
                `}
              >
                <div className="relative shrink-0 p-1 border border-zinc-800 rounded-2xl bg-black">
                  <img src={g.coverUrl} className="w-24 h-16 object-cover rounded-xl grayscale-[0.2] group-hover:grayscale-0 transition-all" alt="" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <h4 className="font-black text-[13px] uppercase tracking-tighter truncate text-zinc-100">{g.title}</h4>
                  <div className="flex items-center space-x-4 mt-3">
                     <div className="h-1.5 bg-zinc-800 flex-1 rounded-full overflow-hidden">
                        <div className={`h-full ${g.completionRate >= 80 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${g.completionRate}%` }}></div>
                     </div>
                     <span className={`text-[11px] font-mono font-black ${g.completionRate >= 80 ? 'text-green-500' : 'text-amber-500'}`}>{g.completionRate}%</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : activeTab === 'achievements' ? (
        <AchievementsView games={games} allAchievements={achievements} language={language} />
      ) : activeTab === 'planning' ? (
        <RoutePlanner games={games} allAchievements={achievements} language={language} />
      ) : activeTab === 'settings' ? (
        <Settings session={session} onLogin={handleLogin} onLogout={handleLogout} language={language} onSync={() => session && loadUserData(session)} isSyncing={isSyncing} />
      ) : activeTab === 'game-detail' && selectedGameId ? (
         <GameDetail game={games.find(g => g.id === selectedGameId)!} achievements={achievements[selectedGameId] || []} onBack={() => setActiveTab('library')} language={language} />
      ) : (
        <Dashboard games={games} onGameClick={navigateToGame} userSession={session} language={language} />
      )}
    </Layout>
  );
};

export default App;
