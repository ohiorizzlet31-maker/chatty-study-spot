// Lightweight static UI translations. No AI / no API.
// Add a key once and it will fall back to English for missing languages.
import { useEffect, useState } from "react";
import { getSettings, useSettingsListener } from "@/lib/settings";

export type Lang = "English" | "Spanish" | "Russian" | "French" | "German" | "Chinese";

type Dict = Record<string, string>;

const en: Dict = {
  // Header tabs
  servers: "Servers", dms: "DMs", news: "News", levels: "Levels",
  games: "Games", music: "Music", ai: "AI", html: "HTML",
  website: "Website", proxy: "Proxy", logs: "Logs", settings: "Settings",
  // Sections
  privacy: "Privacy & UX", theme: "Theme", tabCloak: "Tab Cloak",
  panicKey: "Panic Key", autoLaunch: "Auto launch in disguise",
  // Common
  back: "← Back", close: "Close", cancel: "Cancel", save: "Save",
  delete: "Delete", reset: "Reset", new: "New", retry: "Retry",
  start: "Start", playing: "Playing…", playAgain: "Play again",
  newGame: "New game", restart: "Restart", score: "Score", best: "Best",
  level: "Level", balance: "Balance", bet: "Bet", cashout: "Cashout",
  // Games
  ticTacToe: "Tic Tac Toe", flappy: "Flappy Bird",
  snake: "Snake", dino: "Dino Run", minesweeper: "Minesweeper",
  plinko: "Plinko", mines: "Mines", pong: "Pong",
  rps: "Rock Paper Scissors", whack: "Whack-a-Mole",
  asteroids: "Asteroids", miniMc: "Mini Minecraft",
  hangman: "Hangman", crash: "Crash", roulette: "Roulette",
  htmlGames: "HTML Games", gnmath: "gn-math",
  // Misc
  noMessages: "No messages yet. Say hi 👋",
  message: "Message", send: "Send",
  speed: "Speed", grid: "Grid", language: "Language",
};

// Quick coverage for common languages. Partial dictionaries fall back to en.
const dicts: Record<Lang, Dict> = {
  English: en,
  Spanish: {
    servers: "Servidores", dms: "MD", news: "Noticias", levels: "Niveles",
    games: "Juegos", music: "Música", ai: "IA", html: "HTML",
    website: "Sitios", proxy: "Proxy", logs: "Registros", settings: "Ajustes",
    privacy: "Privacidad y UX", theme: "Tema", tabCloak: "Disfraz de pestaña",
    panicKey: "Tecla de pánico", autoLaunch: "Lanzar disfrazado",
    back: "← Atrás", close: "Cerrar", cancel: "Cancelar", save: "Guardar",
    delete: "Borrar", reset: "Reiniciar", new: "Nuevo", retry: "Reintentar",
    start: "Iniciar", playing: "Jugando…", playAgain: "Jugar de nuevo",
    newGame: "Nueva partida", restart: "Reiniciar", score: "Puntos", best: "Mejor",
    level: "Nivel", balance: "Saldo", bet: "Apuesta", cashout: "Retirar",
    ticTacToe: "Tres en raya", snake: "Serpiente", dino: "Dino", minesweeper: "Buscaminas",
    pong: "Pong", rps: "Piedra Papel Tijera", whack: "Aplasta-topos",
    asteroids: "Asteroides", miniMc: "Mini Minecraft", hangman: "Ahorcado",
    crash: "Crash", roulette: "Ruleta", htmlGames: "Juegos HTML",
    noMessages: "Sin mensajes aún. ¡Saluda 👋!",
    message: "Mensaje", send: "Enviar",
    speed: "Velocidad", grid: "Cuadrícula", language: "Idioma",
  },
  Russian: {
    servers: "Серверы", dms: "ЛС", news: "Новости", levels: "Уровни",
    games: "Игры", music: "Музыка", ai: "ИИ", html: "HTML",
    website: "Сайты", proxy: "Прокси", logs: "Логи", settings: "Настройки",
    privacy: "Приватность", theme: "Тема", tabCloak: "Маска вкладки",
    panicKey: "Кнопка паники", autoLaunch: "Авто-маска",
    back: "← Назад", close: "Закрыть", cancel: "Отмена", save: "Сохранить",
    delete: "Удалить", reset: "Сброс", new: "Новый", retry: "Повтор",
    start: "Старт", playing: "Идёт игра…", playAgain: "Ещё раз",
    newGame: "Новая игра", restart: "Заново", score: "Счёт", best: "Рекорд",
    level: "Уровень", balance: "Баланс", bet: "Ставка", cashout: "Забрать",
    snake: "Змейка", dino: "Динозавр", minesweeper: "Сапёр",
    pong: "Понг", rps: "Камень-Ножницы-Бумага", whack: "Прибей крота",
    asteroids: "Астероиды", miniMc: "Мини Майнкрафт", hangman: "Виселица",
    crash: "Краш", roulette: "Рулетка", htmlGames: "HTML игры",
    noMessages: "Пока нет сообщений. Поздоровайся 👋",
    message: "Сообщение", send: "Отправить",
    speed: "Скорость", grid: "Сетка", language: "Язык",
  },
  French: {
    servers: "Serveurs", dms: "MP", news: "Actualités", levels: "Niveaux",
    games: "Jeux", music: "Musique", ai: "IA", html: "HTML",
    website: "Sites", proxy: "Proxy", logs: "Logs", settings: "Paramètres",
    privacy: "Confidentialité", theme: "Thème", tabCloak: "Camouflage onglet",
    panicKey: "Touche panique", autoLaunch: "Lancement camouflé",
    back: "← Retour", close: "Fermer", cancel: "Annuler", save: "Sauver",
    delete: "Supprimer", reset: "Réinit.", new: "Nouveau", retry: "Réessayer",
    start: "Démarrer", playing: "En jeu…", playAgain: "Rejouer",
    newGame: "Nouvelle partie", restart: "Redémarrer", score: "Score", best: "Meilleur",
    level: "Niveau", balance: "Solde", bet: "Mise", cashout: "Encaisser",
    snake: "Serpent", minesweeper: "Démineur", hangman: "Pendu", roulette: "Roulette",
    noMessages: "Aucun message. Dis salut 👋",
    message: "Message", send: "Envoyer",
    speed: "Vitesse", grid: "Grille", language: "Langue",
  },
  German: {
    servers: "Server", dms: "DMs", news: "News", levels: "Level",
    games: "Spiele", music: "Musik", ai: "KI", html: "HTML",
    website: "Seiten", proxy: "Proxy", logs: "Logs", settings: "Einstellungen",
    privacy: "Privatsphäre", theme: "Thema", tabCloak: "Tab-Tarnung",
    panicKey: "Panik-Taste", autoLaunch: "Getarnt starten",
    back: "← Zurück", close: "Schließen", cancel: "Abbrechen", save: "Speichern",
    delete: "Löschen", reset: "Zurücksetzen", new: "Neu", retry: "Erneut",
    start: "Start", playing: "Läuft…", playAgain: "Nochmal",
    newGame: "Neues Spiel", restart: "Neustart", score: "Punkte", best: "Bestwert",
    level: "Level", balance: "Guthaben", bet: "Einsatz", cashout: "Auszahlen",
    snake: "Schlange", minesweeper: "Minensucher", hangman: "Galgenmännchen", roulette: "Roulette",
    noMessages: "Noch keine Nachrichten. Sag hi 👋",
    message: "Nachricht", send: "Senden",
    speed: "Geschwindigkeit", grid: "Raster", language: "Sprache",
  },
  Chinese: {
    servers: "服务器", dms: "私信", news: "新闻", levels: "等级",
    games: "游戏", music: "音乐", ai: "AI", html: "HTML",
    website: "网站", proxy: "代理", logs: "日志", settings: "设置",
    privacy: "隐私", theme: "主题", tabCloak: "标签伪装",
    panicKey: "紧急键", autoLaunch: "伪装启动",
    back: "← 返回", close: "关闭", cancel: "取消", save: "保存",
    delete: "删除", reset: "重置", new: "新", retry: "重试",
    start: "开始", playing: "游戏中…", playAgain: "再玩",
    newGame: "新游戏", restart: "重启", score: "分数", best: "最佳",
    level: "等级", balance: "余额", bet: "下注", cashout: "提现",
    snake: "贪吃蛇", minesweeper: "扫雷", hangman: "猜字游戏", roulette: "轮盘",
    noMessages: "还没有消息。打个招呼吧 👋",
    message: "消息", send: "发送",
    speed: "速度", grid: "网格", language: "语言",
  },
};

export function t(key: string, lang?: Lang): string {
  const l = (lang || (getSettings() as any).language || "English") as Lang;
  return dicts[l]?.[key] ?? en[key] ?? key;
}

export function useT() {
  const [lang, setLang] = useState<Lang>(((getSettings() as any).language || "English") as Lang);
  useEffect(() => useSettingsListener((s) => setLang(((s as any).language || "English") as Lang)), []);
  return (key: string) => t(key, lang);
}
