import { useEffect, useRef, useState } from 'react'
import { languages, savedLanguage, localizeView, translate, translateError, type Language } from './i18n'
import { ArrowLeft, ArrowRight, Bell, BookHeart, Bookmark, Camera, Check, ChevronLeft, ChevronRight, CirclePlus, Ellipsis, Heart, Home, ImagePlus, Mail, MessageCircle, Moon, Pencil, Plus, Search, Send, Mic, Square, Play, Pause, Settings2, Share2, Sparkles, Trash2, Flag, WandSparkles, X } from 'lucide-react'
import { generateKidsStory } from './kidsStory'
import { getPrivateConversation, listChatContacts, readPrivateMessages, removePrivateMessage, sendPrivateText, sendPrivateVoice, type ChatContact, type PrivateMessage } from './privateChat'
import { confirmationRedirect, listenForAuthCallback } from './authCallback'
import type { User } from '@supabase/supabase-js'
import VoicePlayer, { voiceTime } from './VoicePlayer'
import StoryInteractions from './StoryInteractions'
import StoryMedia from './StoryMedia'
import StatusPanel from './StatusPanel'
import StatusRow, { groupByOwner } from './StatusRow'
import CommentThread from './CommentThread'
import SocialActivity from './SocialActivity'
import ContactsPanel from './ContactsPanel'
import ChatList from './ChatList'
import { ChatAttachments, ChatMessageBody, EmojiButton, VoiceDraftPreview } from './ChatAttachments'
import { PublicProfileModal, PostDetailModal } from './ProfileViews'
import SafeVideo from './SafeVideo'
import './compact-fixes.css'
import useInactivityLock from './useInactivityLock'
import { PostCards } from './ProfileViews'
import './profile-lists.css'
import ProfileMedia from './ProfileMedia'
import './profile-media.css'
import { formatCreatedAt } from './timestamps'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import './social-interactions.css'
import './final-fixes.css'
import { useChatNotifications, ChatNoticeBanner } from './ChatNotice'
import { supabase, PROFILE_BUCKET, deviceId, resizeImage, blobToDataUrl } from './supabase'

type Profile = { name: string; handle: string; bio: string; avatarUrl?: string; coverUrl?: string }

type Tab = 'home' | 'stories' | 'create' | 'chats' | 'profile'
type Post = { id: number; cloudId?: string; postType?: 'text' | 'photo' | 'video'; ownerId?: string; author: string; handle: string; avatar: string; avatarUrl?: string; time: string; createdAt?: string; text: string; image?: string; video?: string; videoPath?: string; likes: number; comments: number; liked?: boolean; saved?: boolean }
type ChatMessage = { id?: string; from: 'me' | 'them'; text: string; time: string }
type KidStory = { id?: string; title: string; child: string; theme: string; text: string; date: string; createdAt?: string }

const photos = {
  friends: 'https://images.unsplash.com/photo-1520880867055-1e30d1cb001c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDU0ODQzfDB8MXxzZWFyY2h8MXx8ZnJpZW5kcyUyMGxhdWdoaW5nJTIwdG9nZXRoZXIlMjBvdXRkb29ycyUyMGNhbmRpZCUyMHdhcm0lMjBzdW5saWdodHxlbnwxfHx8fDE3OTAzNTQ5NTF8MA&ixlib=rb-4.1.0&q=80&w=1080',
  portrait: 'https://images.unsplash.com/photo-1662850886700-4ec19bd30d11?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDU0ODQzfDB8MXxzZWFyY2h8MXx8d29tYW4lMjBwb3J0cmFpdCUyMG5hdHVyYWwlMjBzbWlsaW5nfGVufDF8fHx8MTc5MDM1NDk1MXww&ixlib=rb-4.1.0&q=80&w=1080',
  reading: 'https://images.unsplash.com/photo-1758874961197-893028499f9f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDU0ODQzfDB8MXxzZWFyY2h8Mnx8Y296eSUyMGZhbWlseSUyMHJlYWRpbmclMjBib29rJTIwY2hpbGQlMjBpbGx1c3RyYXRpb258ZW58MXx8fHwxNzkwMzU0OTUyfDA&ixlib=rb-4.1.0&q=80&w=1080',
  picnic: 'https://images.unsplash.com/photo-1658227412301-75d89b92aae0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMDU0ODQzfDB8MXxzZWFyY2h8Mnx8d2Vla2VuZCUyMHBpY25pYyUyMHBhcmslMjBmcmllbmRzJTIwY2FuZGlkfGVufDF8fHx8MTc5MDM1NDk1MXww&ixlib=rb-4.1.0&q=80&w=1080',
}
const people = [
  { name: 'Maya Chen', initial: 'M', color: 'peach', image: photos.portrait },
  { name: 'Olivia Park', initial: 'O', color: 'lilac' },
  { name: 'Leo Martin', initial: 'L', color: 'sage' },
  { name: 'Nina Rose', initial: 'N', color: 'yellow' },
]
const initialPosts: Post[] = [
  { id: 1, author: 'Maya Chen', handle: 'mayachen', avatar: 'M', time: '2 hours ago', text: 'The best kind of afternoons are the ones that turn into memories. A little sunshine, good friends, and nowhere else to be. ☀️', image: photos.friends, likes: 128, comments: 18 },
  { id: 2, author: 'Olivia Park', handle: 'oliviap', avatar: 'O', time: 'Yesterday', text: 'A reminder to slow down and celebrate the little things. Made time for a long walk and a really good cup of coffee today.', likes: 86, comments: 12 },
  { id: 3, author: 'Leo Martin', handle: 'leom', avatar: 'L', time: 'Yesterday', text: 'Weekend plans: fresh air, shared snacks, and absolutely no schedule. 🌿', image: photos.picnic, likes: 94, comments: 9 },
]
const initialConversations: Record<string, ChatMessage[]> = {
  'Maya Chen': [{ from: 'them', text: 'Hey! So lovely seeing you this weekend.', time: '10:42' }, { from: 'me', text: 'I had the best time! We should do it again soon.', time: '10:45' }, { from: 'them', text: 'Absolutely! Are you free on Saturday? ☀️', time: '10:48' }],
  'Olivia Park': [{ from: 'them', text: 'I found that little bookstore we talked about!', time: 'Yesterday' }],
  'Leo Martin': [{ from: 'them', text: 'Thanks for sharing those photos 🙌', time: 'Tuesday' }],
  'Nina Rose': [{ from: 'them', text: 'Coffee next week?', time: 'Monday' }],
}
const tabs: { id: Tab; label: string; Icon: typeof Home }[] = [
  { id: 'home', label: 'Home', Icon: Home }, { id: 'stories', label: 'Stories', Icon: CirclePlus }, { id: 'create', label: 'Kids Stories', Icon: BookHeart }, { id: 'chats', label: 'Chats', Icon: MessageCircle }, { id: 'profile', label: 'Profile', Icon: Settings2 },
]
const readStore = <T,>(key: string, fallback: T): T => { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback } catch { return fallback } }

function Avatar({ name, image, size = 'normal', color = 'peach' }: { name: string; image?: string; size?: 'small' | 'normal' | 'large'; color?: string }) {
  return <span className={`avatar avatar-${size} avatar-${color}`}>{image ? <img src={image} alt={name} /> : name.charAt(0).toUpperCase()}</span>
}

function App() {
  const [language, setLanguage] = useState<Language>(savedLanguage)
  const [showPw, setShowPw] = useState(false)
  const [recovery, setRecovery] = useState(false)
  const [newPw, setNewPw] = useState('')
  const [authNote, setAuthNote] = useState('')
  useEffect(() => {
    try { localStorage.setItem('mn-language', language) } catch { /* Keep switching available when device storage is restricted. */ }
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
  }, [language])
  const [tab, setTab] = useState<Tab>('home')
  const [profile, setProfile] = useState<Profile>(() => readStore<Profile>('mn-profile', { name: 'Alex Morgan', handle: 'alexmorgan', bio: 'Collecting little moments and good stories. ✨' }))
  const [posts, setPosts] = useState<Post[]>(() => readStore('mn-posts', initialPosts))
  const [dailyStories, setDailyStories] = useState<{ id?: string | number; ownerId?: string; createdAt?: string; name: string; text: string; image?: string }[]>(() => readStore('mn-daily', [{ name: 'Maya Chen', text: 'An afternoon worth remembering ☀️', image: photos.friends }, { name: 'Olivia Park', text: 'A little joy in the everyday.', image: photos.portrait }, { name: 'Leo Martin', text: 'Out here making memories.', image: photos.picnic }]))
  const [kidStories, setKidStories] = useState<KidStory[]>(() => readStore('mn-kids', []))
  const [conversations, setConversations] = useState<Record<string, ChatMessage[]>>(() => readStore('mn-chats', initialConversations))
  const [activeChat, setActiveChat] = useState<string | null>(null)
  const [activeContactId, setActiveContactId] = useState<string | null>(null)
  const [chatInput, setChatInput] = useState('')
  const [modal, setModal] = useState<'post' | 'story' | 'profile' | 'account' | 'notifications' | 'delete' | null>(null)
  const [selectedStory, setSelectedStory] = useState<number | null>(null)
  const [postText, setPostText] = useState('')
  const [postImage, setPostImage] = useState('')
  const [storyText, setStoryText] = useState('')
  const [storyImage, setStoryImage] = useState('')
  const [postFile, setPostFile] = useState<Blob | null>(null)
  const [savingPost, setSavingPost] = useState(false)
  const [storyMenu, setStoryMenu] = useState(false)
  const [confirmStory, setConfirmStory] = useState<number | null>(null)
  const [confirmDel, setConfirmDel] = useState<{ kind: 'photo' | 'video' | 'post' | 'story'; detail?: string; run: () => void } | null>(null)
  const [storyFile, setStoryFile] = useState<Blob | null>(null)
  const [savingStory, setSavingStory] = useState(false)
  const [menuPost, setMenuPost] = useState<number | null>(null)
const [profileOf, setProfileOf] = useState<{ id: string; name: string } | null>(null)
const [openPost, setOpenPost] = useState<Post | null>(null)
const [profileSection, setProfileSection] = useState<null | 'posts' | 'videos' | 'stories' | 'kids'>(null)
const [voicePaused, setVoicePaused] = useState(false)
const pausedAtRef = useRef(0)
  const [draftProfile, setDraftProfile] = useState(profile)
  const [childName, setChildName] = useState('')
  const [theme, setTheme] = useState('A magical adventure')
  const [age, setAge] = useState('4–6 years')
  const [generated, setGenerated] = useState<KidStory | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [search, setSearch] = useState('')
  const [focusComment, setFocusComment] = useState<string | undefined>()
  const [showComments, setShowComments] = useState<number | null>(null)
  const [commentText, setCommentText] = useState('')
  const [comments, setComments] = useState<Record<number, { id?: string; userId?: string; name: string; text: string; createdAt?: string }[]>>({})
  const [toast, setToast] = useState('')
  const [isMember, setIsMember] = useState(false)
  const [authReady, setAuthReady] = useState(false)
  const [accountName, setAccountName] = useState('')
  const [accountEmail, setAccountEmail] = useState('')
  const [accountPassword, setAccountPassword] = useState('')
  const [accountMode, setAccountMode] = useState<'join' | 'login'>('join')
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null)
  const [contacts, setContacts] = useState<ChatContact[]>([])
  const [chatId, setChatId] = useState<string | null>(null)
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([])
  const chatNotice = useChatNotifications({ userId: authUser?.id ?? null, contacts, activeContactId, tab, messageCount: privateMessages.length })
  const [chatBusy, setChatBusy] = useState(false)
  const [accountBusy, setAccountBusy] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordingMs, setRecordingMs] = useState(0)
  const [voiceDraft, setVoiceDraft] = useState<{ blob: Blob; durationMs: number } | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const startedRef = useRef(0)
  const discardRef = useRef(false)
  const chatChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Signed-in profiles are loaded from Supabase, not shared device-wide local storage.
  useEffect(() => { if (authReady && !authUser) localStorage.setItem('mn-posts', JSON.stringify(posts)) }, [posts, authReady, authUser])
  useEffect(() => { if (authReady && !authUser) localStorage.setItem('mn-daily', JSON.stringify(dailyStories)) }, [dailyStories, authReady, authUser])
  useEffect(() => { if (authReady && !authUser) localStorage.setItem('mn-kids', JSON.stringify(kidStories)) }, [kidStories, authReady, authUser])
  useEffect(() => { localStorage.setItem('mn-chats', JSON.stringify(conversations)) }, [conversations])
  useInactivityLock(authUser, () => { void supabase.auth.signOut({ scope: 'local' }).then(() => { setAuthUser(null); setAccountMode('login'); setToast('For your security, please sign in again.') }) })
  useEffect(() => {
    let live = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (!live) return
      if (error) setToast(error.message)
      setAuthUser(data.session?.user ?? null); setAuthReady(true)
    }).catch(() => { if (live) setAuthReady(true) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'PASSWORD_RECOVERY' && live) setRecovery(true)
      if (live) { setAuthUser(session?.user ?? null); setAuthReady(true) }
    })
    const stopLink = listenForAuthCallback(() => { void supabase.auth.getSession().then(({ data }) => { if (data.session) { setAuthUser(data.session.user); setModal(null); setToast('Email confirmed. Welcome to MingleNest!') } else { setToast('Email confirmed. Sign in to continue.'); setAccountMode('login'); setModal('account') } }) }, setToast)
    return () => { live = false; listener.subscription.unsubscribe(); stopLink() }
  }, [])
  useEffect(() => {
    if (!authReady) return
    if (!authUser) { setIsMember(false); setProfile(readStore<Profile>('mn-profile', { name: 'Alex Morgan', handle: 'alexmorgan', bio: '' })); setPosts(readStore('mn-posts', initialPosts)); setDailyStories(readStore('mn-daily', [{ name: 'Maya Chen', text: 'An afternoon worth remembering ☀️', image: photos.friends }, { name: 'Olivia Park', text: 'A little joy in the everyday.', image: photos.portrait }, { name: 'Leo Martin', text: 'Out here making memories.', image: photos.picnic }])); setKidStories(readStore('mn-kids', [])); return }
    let live = true
    setIsMember(true)
    const name = String(authUser.user_metadata?.display_name || authUser.email?.split('@')[0] || 'Member')
    const initial = { name, handle: name.toLowerCase().replace(/\s+/g, ''), bio: '', avatarUrl: '', coverUrl: '' }
    setProfile(initial); setDraftProfile(initial)
    supabase.from('profiles').select('full_name,username,handle,bio,avatar_url,cover_url').eq('id', authUser.id).maybeSingle().then(({ data }) => {
      if (!live || !data) return
      const next = { name: data.full_name || String(authUser.user_metadata?.display_name || 'Member'), handle: data.handle || data.username || '', bio: data.bio || '', avatarUrl: data.avatar_url || '', coverUrl: data.cover_url || '' }
      setProfile(next); setDraftProfile(next)
    })
    return () => { live = false }
  }, [authUser?.id, authReady])
  useEffect(() => {
    if (!authUser) return
    let live = true
    const load = async () => {
      const [postResult, storyResult, profileResult, likeResult, commentResult, kidResult] = await Promise.all([
        supabase.from('posts').select('id,user_id,content,image_url,video_url,video_path,post_type,created_at').order('created_at', { ascending: false }).limit(100),
        supabase.from('stories').select('id,user_id,caption,media_url,created_at').order('created_at', { ascending: false }).limit(100),
        supabase.from('profiles').select('id,full_name,username,avatar_url'),
        supabase.from('post_reactions').select('post_id,user_id'),
        supabase.from('post_comments').select('id,post_id,user_id,content,created_at').is('deleted_at', null).order('created_at'),
        supabase.from('kids_stories').select('id,title,content,created_at').eq('user_id', authUser.id).order('created_at', { ascending: false }),
      ])
      if (!live) return
      const videoLinks = new Map<string, string>()
      await Promise.all((postResult.data || []).filter(p => p.video_path).map(async p => {
        const { data, error } = await supabase.storage.from('post-videos').createSignedUrl(p.video_path!, 3600)
        if (!error && data) videoLinks.set(p.id, data.signedUrl)
      }))
      if (!live) return
      const names = new Map((profileResult.data || []).map(person => [person.id, person]))
      if (!postResult.error) setPosts([...((postResult.data || []).map(item => {
        const owner = names.get(item.user_id)
        const likes = (likeResult.data || []).filter(like => like.post_id === item.id)
        return { id: parseInt(item.id.replace(/-/g, '').slice(0, 12), 16), cloudId: item.id, postType: (item.post_type || undefined) as Post['postType'], ownerId: item.user_id, author: owner?.full_name || 'Member', handle: owner?.username || 'member', avatar: (owner?.full_name || 'M')[0], avatarUrl: owner?.avatar_url || undefined, createdAt: item.created_at, time: '', text: item.content || '', image: item.image_url || undefined, video: videoLinks.get(item.id) || item.video_url || undefined, videoPath: item.video_path || undefined, likes: likes.length, comments: (commentResult.data || []).filter(comment => comment.post_id === item.id).length, liked: likes.some(like => like.user_id === authUser.id) } as Post
      })), ...initialPosts])
      if (!storyResult.error) setDailyStories([...(storyResult.data || []).map(item => ({ id: item.id, ownerId: item.user_id, createdAt: item.created_at, name: names.get(item.user_id)?.full_name || 'Member', text: item.caption || '', image: item.media_url || undefined })), { name: 'Maya Chen', text: 'An afternoon worth remembering ☀️', image: photos.friends }, { name: 'Olivia Park', text: 'A little joy in the everyday.', image: photos.portrait }, { name: 'Leo Martin', text: 'Out here making memories.', image: photos.picnic }])
      if (!commentResult.error) {
        const mapped: Record<number, { id?: string; userId?: string; name: string; text: string; createdAt?: string }[]> = {}
        for (const item of commentResult.data || []) { const key = parseInt(item.post_id.replace(/-/g, '').slice(0, 12), 16); (mapped[key] ||= []).push({ id: item.id, userId: item.user_id, name: names.get(item.user_id)?.full_name || 'Member', text: item.content, createdAt: item.created_at }) }
        setComments(mapped)
      }
      if (!kidResult.error) setKidStories((kidResult.data || []).map(item => {
        try {
          const parsed = JSON.parse(item.content || '{}')
          if (typeof parsed.text !== 'string') throw new Error('Legacy story')
          return { ...parsed, title: item.title || parsed.title, id: item.id, createdAt: item.created_at } as KidStory
        }
        catch { return { id: item.id, title: item.title || 'A little story', text: item.content || '', child: '', theme: '', date: '', createdAt: item.created_at } }
      }))
    }
    void load()
    return () => { live = false }
  }, [authUser?.id])
  // Re-read normal Stories from the database when switching tabs, closing the viewer or refocusing the app.
  useEffect(() => {
    if (!authUser || selectedStory !== null) return
    let live = true
    const refreshStories = async () => {
      const { data, error } = await supabase.from('stories').select('id,user_id,caption,media_url,created_at').order('created_at', { ascending: false }).limit(100)
      if (error || !data || !live) return
      const ids = [...new Set(data.map(row => row.user_id))]
      const { data: owners } = ids.length ? await supabase.from('profiles').select('id,full_name').in('id', ids) : { data: [] as { id: string; full_name: string | null }[] }
      if (!live) return
      const nameOf = new Map((owners || []).map(o => [o.id, o.full_name]))
      setDailyStories(items => [...data.map(row => ({ id: row.id, ownerId: row.user_id, createdAt: row.created_at, name: nameOf.get(row.user_id) || 'Member', text: row.caption || '', image: row.media_url || undefined })), ...items.filter(item => item.id === undefined)])
    }
    void refreshStories()
    window.addEventListener('focus', refreshStories)
    return () => { live = false; window.removeEventListener('focus', refreshStories) }
  }, [authUser?.id, tab, selectedStory, modal])
  useEffect(() => {
    if (!authUser) { setContacts([]); setChatId(null); setPrivateMessages([]); return }
    const refresh = () => listChatContacts(authUser.id).then(setContacts).catch(() => setToast('Could not load chat contacts'))
    refresh()
    const channel = supabase.channel('chat-user-directory').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_users' }, refresh).subscribe()
    window.addEventListener('focus', refresh)
    return () => { supabase.removeChannel(channel); window.removeEventListener('focus', refresh) }
  }, [authUser])
  useEffect(() => {
    if (!authUser || tab !== 'chats' || !activeContactId) { setChatId(null); setPrivateMessages([]); return }
    const contact = contacts.find(person => person.id === activeContactId)
    if (!contact) { setChatId(null); setPrivateMessages([]); return }
    let cancelled = false
    setChatId(null); setPrivateMessages([])
    getPrivateConversation(contact.id).then(async id => {
      if (cancelled) return
      setChatId(id)
      const messages = await readPrivateMessages(id)
      if (!cancelled) setPrivateMessages(messages)
    }).catch(() => { if (!cancelled) setToast('Could not open this conversation') })
    return () => { cancelled = true }
  }, [authUser?.id, tab, activeContactId, contacts])
  useEffect(() => {
    if (!chatId) return
    const refresh = () => readPrivateMessages(chatId).then(setPrivateMessages).catch(() => {})
    const channel = supabase.channel(`chat:${chatId}`, { config: { private: true } })
      .on('broadcast', { event: 'message-deleted' }, payload => {
        // A member may announce a deletion, but only the database decides what
        // actually disappeared. Never trust a broadcast ID as proof of deletion.
        if ((payload.payload as { id?: string }).id) void refresh()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${chatId}` }, refresh).subscribe()
    chatChannelRef.current = channel
    const onFocus = () => refresh()
    const interval = window.setInterval(refresh, 12000)
    window.addEventListener('focus', onFocus)
    return () => { if (chatChannelRef.current === channel) chatChannelRef.current = null; supabase.removeChannel(channel); window.clearInterval(interval); window.removeEventListener('focus', onFocus) }
  }, [chatId])
  useEffect(() => {
    if (!recording) return
    const interval = window.setInterval(() => { if (recorderRef.current?.state === 'recording') setRecordingMs(Date.now() - startedRef.current) }, 200)
    return () => window.clearInterval(interval)
  }, [recording])
  useEffect(() => () => { discardRef.current = true; if (recorderRef.current?.state === 'recording') recorderRef.current.stop(); streamRef.current?.getTracks().forEach(track => track.stop()) }, [])
  useEffect(() => { if (authReady) localStorage.setItem('mn-member', JSON.stringify(!!authUser)) }, [authReady, authUser?.id])
  useEffect(() => { if (toast) { const timeout = window.setTimeout(() => setToast(''), 3000); return () => clearTimeout(timeout) } }, [toast])

  const [avatarFile, setAvatarFile] = useState<Blob | null>(null)
  const [coverFile, setCoverFile] = useState<Blob | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const shown = modal === 'profile' ? draftProfile : profile
  const pickImage = async (event: React.ChangeEvent<HTMLInputElement>, kind: 'avatar' | 'cover') => {
    const file = event.target.files?.[0]; event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { setToast('Please choose an image file'); return }
    try {
      const blob = await resizeImage(file, kind === 'avatar' ? 512 : 1400)
      const url = URL.createObjectURL(blob)
      if (kind === 'avatar') { setAvatarFile(blob); setDraftProfile(d => ({ ...d, avatarUrl: url })) }
      else { setCoverFile(blob); setDraftProfile(d => ({ ...d, coverUrl: url })) }
    } catch { setToast('Could not read that image') }
  }
  const saveProfile = async () => {
    if (savingProfile || !draftProfile.name.trim() || !draftProfile.handle.trim()) return
    setSavingProfile(true)
    let cloud = true
    const upload = async (blob: Blob, kind: string) => {
      try {
        const path = `${authUser?.id || deviceId}/${kind}-${Date.now()}.jpg`
        const { error } = await supabase.storage.from(PROFILE_BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: true })
        if (error) throw error
        return supabase.storage.from(PROFILE_BUCKET).getPublicUrl(path).data.publicUrl
      } catch { cloud = false; return blobToDataUrl(blob) }
    }
    const next: Profile = { ...draftProfile }
    if (avatarFile) next.avatarUrl = await upload(avatarFile, 'avatar')
    if (coverFile) next.coverUrl = await upload(coverFile, 'cover')
    try {
      if (!authUser) throw new Error('Sign in to sync your profile')
      const { error } = await supabase.from('profiles').upsert({ id: authUser.id, full_name: next.name, username: next.handle, handle: next.handle, bio: next.bio, avatar_url: next.avatarUrl?.startsWith('data:') ? null : next.avatarUrl ?? null, cover_url: next.coverUrl?.startsWith('data:') ? null : next.coverUrl ?? null, updated_at: new Date().toISOString() })
      if (!error) await supabase.from('chat_users').update({ display_name: next.name }).eq('id', authUser.id)
      if (error) throw error
    } catch (error) {
      if ((error as { code?: string })?.code === '23505') { setToast('That username is already taken. Please choose another one.'); setSavingProfile(false); return }
      cloud = false
    }
    setProfile(next); setAvatarFile(null); setCoverFile(null); setSavingProfile(false); setModal(null)
    setToast(cloud ? 'Profile updated' : 'Profile saved on this device — cloud storage isn’t reachable yet')
  }
  const openTab = (next: Tab) => { if (recording) stopRecording(true); setVoiceDraft(null); setTab(next); setActiveChat(null); setActiveContactId(null); setGenerated(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const openChat = (name: string, id: string | null) => { if (!id) { setToast('This person has not joined chat yet'); return } if (recording) stopRecording(true); setVoiceDraft(null); setActiveChat(name); setActiveContactId(id); setTab('chats') }
  const toggleLike = async (id: number) => {
    const post = posts.find(item => item.id === id)
    if (!post) return
    if (post.cloudId && !authUser) { setToast('Sign in to like posts'); return }
    if (post.cloudId && authUser) {
      const request = post.liked ? supabase.from('post_reactions').delete().eq('post_id', post.cloudId).eq('user_id', authUser.id) : supabase.from('post_reactions').insert({ post_id: post.cloudId, user_id: authUser.id })
      const { error } = await request
      if (error) { setToast('Could not update your reaction'); return }
    }
    setPosts(items => items.map(item => item.id === id ? { ...item, liked: !item.liked, likes: item.likes + (item.liked ? -1 : 1) } : item))
  }
  const toggleSave = (id: number) => { setPosts(items => items.map(post => post.id === id ? { ...post, saved: !post.saved } : post)); setToast('Saved posts are available on your profile') }
  const pickPostImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ''
    if (!file) return
    if (file.type.startsWith('video/')) {
      if (!['video/mp4','video/webm','video/quicktime','video/3gpp','video/x-m4v'].includes(file.type)) { setToast('Please choose an MP4, WebM, MOV or 3GP video'); return }
      if (file.size > 100 * 1024 * 1024) { setToast('Choose a video smaller than 100 MB'); return }
      if (postImage.startsWith('blob:')) URL.revokeObjectURL(postImage)
      setPostFile(file); setPostImage(URL.createObjectURL(file)); return
    }
    if (!file.type.startsWith('image/')) { setToast('Please choose a photo or video'); return }
    try { const blob = await resizeImage(file, 1280); setPostFile(blob); setPostImage(URL.createObjectURL(blob)) } catch { setToast('Could not read that image') }
  }
  const publishPost = async () => {
    const text = postText.trim().normalize('NFC')
    if ((!text && !postFile) || savingPost) return
    if (!authUser) { setModal('account'); return }
    setSavingPost(true)
    const isVideo = postFile?.type.startsWith('video/') || false
    const bucket = isVideo ? 'post-videos' : PROFILE_BUCKET
    let uploadedPath: string | undefined
    let inserted = false
    try {
      let imageUrl: string | undefined
      let videoUrl: string | undefined
      if (postFile) {
        const ext = isVideo ? ({'video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov','video/3gpp':'3gp','video/x-m4v':'m4v'}[postFile.type] || 'mp4') : 'jpg'
        const path = `${authUser.id}/post-${crypto.randomUUID()}.${ext}`
        const { error } = await supabase.storage.from(bucket).upload(path, postFile, { contentType: postFile.type, upsert: false })
        if (error) throw error
        uploadedPath = path
        if (isVideo) {
          const { data, error: linkError } = await supabase.storage.from(bucket).createSignedUrl(path, 3600)
          if (linkError) throw linkError
          videoUrl = data.signedUrl
        } else imageUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
      }
      const { data, error } = await supabase.from('posts').insert({ user_id: authUser.id, content: text, image_url: imageUrl || null, video_path: isVideo ? uploadedPath : null, post_type: isVideo ? 'video' : imageUrl ? 'photo' : 'text' }).select('id,created_at').single()
      if (error) throw error
      inserted = true
      setPosts(items => [{ id: parseInt(data.id.replace(/-/g, '').slice(0, 12), 16), cloudId: data.id, postType: isVideo ? 'video' : imageUrl ? 'photo' : 'text', ownerId: authUser.id, author: profile.name, handle: profile.handle, avatar: profile.name.charAt(0), avatarUrl: profile.avatarUrl, createdAt: data.created_at, time: '', text, image: imageUrl, video: videoUrl, videoPath: isVideo ? uploadedPath : undefined, likes: 0, comments: 0 }, ...items])
      if (postImage.startsWith('blob:')) URL.revokeObjectURL(postImage)
      setPostText(''); setPostImage(''); setPostFile(null); setModal(null); setTab('home'); setToast('Your moment is live!')
    } catch {
      if (isVideo && uploadedPath && !inserted) await supabase.storage.from(bucket).remove([uploadedPath])
      setToast('Could not publish. Your draft is still here; please try again.')
    } finally { setSavingPost(false) }
  }
  const deleteStory = async (index: number) => {
    const story = dailyStories[index]
    if (!story) return
    if (story.ownerId && story.ownerId !== authUser?.id) return
    if (story.id !== undefined) {
      if (!authUser || story.ownerId !== authUser.id) return
      const { data, error } = await supabase.from('stories').delete().eq('id', story.id).eq('user_id', authUser.id).select('id')
      if (error || !data?.length) { setToast('Could not delete this story. Please try again.'); return }
    }
    setStoryMenu(false); setSelectedStory(null)
    setDailyStories(items => items.filter((_, i) => i !== index))
    setToast('Story deleted successfully.')
  }
  const shareStory = async (index: number) => {
    const story = dailyStories[index]; setStoryMenu(false)
    const data = { title: 'MingleNest story', text: `${story.name}: ${story.text}`, url: window.location.href }
    try { if (navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(`${data.text} ${data.url}`); setToast('Story link copied to clipboard') } } catch { /* share cancelled */ }
  }
  const canDeletePost = (post: Post) => post.cloudId ? post.ownerId === authUser?.id : post.author === profile.name
  const pickStoryImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { setToast('Please choose an image file'); return }
    try { const blob = await resizeImage(file, 1080); setStoryFile(blob); setStoryImage(URL.createObjectURL(blob)) } catch { setToast('Could not read that image') }
  }
  const publishStory = async () => {
    const caption = storyText.trim().normalize('NFC')
    if ((!caption && !storyFile) || savingStory) return
    if (!authUser) { setAccountMode('login'); setModal('account'); return }
    setSavingStory(true)
    let cloud = true
    let mediaUrl: string | undefined
    if (storyFile) {
      try {
        const path = `${authUser?.id || deviceId}/story-${Date.now()}.jpg`
        const { error } = await supabase.storage.from(PROFILE_BUCKET).upload(path, storyFile, { contentType: 'image/jpeg' })
        if (error) throw error
        mediaUrl = supabase.storage.from(PROFILE_BUCKET).getPublicUrl(path).data.publicUrl
      } catch (error) { console.warn('Story upload failed', error); cloud = false; mediaUrl = await blobToDataUrl(storyFile) }
    }
    let storyId: string | number | undefined
    let createdAt: string | undefined
    if (cloud) {
      try {
        const { data, error } = await supabase.from('stories').insert({ user_id: authUser.id, media_url: mediaUrl ?? null, caption }).select('id,created_at').single()
        if (error) throw error
        storyId = data?.id
        createdAt = data?.created_at
      } catch (error) { console.warn('Story insert failed', error); cloud = false }
    }
    if (!cloud || !storyId) { setSavingStory(false); setToast('Something went wrong. Please try again.'); return }
    setDailyStories(items => [{ id: storyId, ownerId: authUser.id, createdAt, name: profile.name, text: caption, image: mediaUrl }, ...items])
    setStoryText(''); setStoryImage(''); setStoryFile(null); setSavingStory(false); setModal(null)
    setToast(cloud ? 'Story shared with your circle' : 'Story added here, but it could not be saved to the cloud')
  }
  const deletePrivateMessage = async (message: PrivateMessage) => {
    if (!authUser) return
    try {
      await removePrivateMessage(message, authUser.id)
      setPrivateMessages(items => items.filter(item => item.id !== message.id))
      // Broadcast the ID as well as using Postgres changes: RLS can suppress
      // DELETE payloads once their row no longer exists.
      if (chatChannelRef.current) void chatChannelRef.current.send({ type: 'broadcast', event: 'message-deleted', payload: { id: message.id } })
      setDeletingMessageId(null); setToast('Message deleted successfully.')
    } catch (error) {
      // The row may already be gone even if Storage removal failed; reload the
      // authoritative conversation instead of leaving a deleted bubble on screen.
      if (chatId) void readPrivateMessages(chatId).then(setPrivateMessages).catch(() => {})
      console.warn('Message delete failed', error)
      setToast('Could not delete this message. Please try again.'); setDeletingMessageId(null)
    }
  }
  const deleteMessage = async (chat: string, message: ChatMessage, index: number) => {
    setConversations(current => ({ ...current, [chat]: (current[chat] || []).filter((m, i) => message.id ? m.id !== message.id : i !== index) }))
    if (!message.id) return
    try { const { error } = await supabase.from('messages').delete().eq('id', message.id); if (error) throw error } catch (error) { console.warn('Message delete failed', error); setToast('Could not delete this message. Please try again.') }
  }
  const deleteKidStory = async (story: KidStory, index: number) => {
    if (story.id) {
      try { const { error } = await supabase.from('kids_stories').delete().eq('id', story.id); if (error) throw error } catch (error) { console.warn('Kids story delete failed', error); setToast('Could not delete this story. Please try again.'); return }
    }
    setKidStories(items => items.filter((s, i) => story.id ? s.id !== story.id : i !== index))
    setToast('Story deleted successfully.')
  }
  const deletePost = async (id: number) => {
    const post = posts.find(item => item.id === id)
    if (!post || !canDeletePost(post)) return
    setMenuPost(null)
    const noun = post.postType === 'video' || post.videoPath || post.video ? 'Video' : post.postType === 'photo' || post.image ? 'Photo' : 'Post'
    if (post.cloudId) {
      const { data, error } = await supabase.from('posts').delete().eq('id', post.cloudId).eq('user_id', authUser!.id).select('id')
      if (error || !data?.length) { setToast(`Could not delete this ${noun.toLowerCase()}. Please try again.`); return }
    }
    setPosts(items => items.filter(item => item.id !== id))
    if (post.videoPath) {
      const { error } = await supabase.storage.from('post-videos').remove([post.videoPath])
      if (error) console.warn('Video file cleanup failed', error)
    }
    setToast(`${noun} deleted successfully.`)
  }
  const askDeletePost = (id: number) => {
    const post = posts.find(item => item.id === id)
    if (!post) return
    setMenuPost(null)
    const kind = post.postType === 'video' || post.videoPath || post.video ? 'video' : post.postType === 'photo' || post.image ? 'photo' : 'post'
    const caption = post.text?.trim()
    setConfirmDel({ kind, detail: caption ? (caption.length > 60 ? caption.slice(0, 60) + '…' : caption) : undefined, run: () => void deletePost(id) })
  }
  const sendMessage = async () => {
    if (!activeChat || !chatInput.trim()) return
    if (!authUser || !chatId) { setToast('Sign in and choose a real contact to send messages'); return }
    const text = chatInput.trim().normalize('NFC'); setChatBusy(true)
    try { const message = await sendPrivateText(chatId, authUser.id, text); setPrivateMessages(prev => prev.some(item => item.id === message.id) ? prev : [...prev, message]); setChatInput('') }
    catch (error) { setToast(error instanceof Error ? error.message : 'Message could not be sent') }
    finally { setChatBusy(false) }
  }
  const startRecording = async () => {
    if (!authUser || !chatId) { setToast('Sign in and choose a real contact to record'); return }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setToast('Microphone recording is not available on this device'); return }
    try {
      setVoiceDraft(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].find(type => MediaRecorder.isTypeSupported(type))
      if (!mimeType) { stream.getTracks().forEach(track => track.stop()); throw new Error('Audio format is not supported on this device') }
      const recorder = new MediaRecorder(stream, { mimeType })
      const chunks: BlobPart[] = []
      recorderRef.current = recorder
      discardRef.current = false
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop())
        streamRef.current = null
        setRecording(false)
        if (discardRef.current) return
        const durationMs = Date.now() - startedRef.current
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/mp4' })
        if (blob.size && durationMs > 0) setVoiceDraft({ blob, durationMs })
        else setToast('Recording was empty; please try again')
      }
      recorder.onerror = () => { stream.getTracks().forEach(track => track.stop()); streamRef.current = null; setRecording(false); setToast('Recording failed') }
      recorder.start(250)
      startedRef.current = Date.now(); setRecordingMs(0); setVoicePaused(false); setRecording(true)
    } catch (error) { setToast(error instanceof Error && error.message.startsWith('Audio format') ? error.message : 'Microphone permission is needed to record a voice message') }
  }
  const stopRecording = (cancel = false) => {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      if (recorder.state === 'paused') startedRef.current += Date.now() - pausedAtRef.current
      discardRef.current = cancel; recorder.stop()
    }
    setVoicePaused(false)
    if (cancel) { setVoiceDraft(null); setRecordingMs(0) }
  }
  const togglePauseRecording = () => {
    const recorder = recorderRef.current
    if (!recorder) return
    try {
      if (recorder.state === 'recording') { recorder.pause(); pausedAtRef.current = Date.now(); setVoicePaused(true) }
      else if (recorder.state === 'paused') { recorder.resume(); startedRef.current += Date.now() - pausedAtRef.current; setVoicePaused(false) }
    } catch { setToast('Pausing is not supported on this device') }
  }
  const reRecord = () => { setVoiceDraft(null); setRecordingMs(0); void startRecording() }
  const sendRecording = async () => {
    if (!authUser || !chatId || !voiceDraft || chatBusy) return
    setChatBusy(true)
    try {
      const message = await sendPrivateVoice(chatId, authUser.id, voiceDraft.blob, voiceDraft.durationMs)
      setPrivateMessages(prev => prev.some(item => item.id === message.id) ? prev : [...prev, message]); setVoiceDraft(null)
    } catch (error) { setToast(error instanceof Error ? error.message : 'Voice message could not be sent') }
    finally { setChatBusy(false) }
  }
  const addComment = async (id: number) => {
    if (!commentText.trim()) return
    const post = posts.find(item => item.id === id)
    if (post?.cloudId && !authUser) { setToast('Sign in to comment'); return }
    const text = commentText.trim().normalize('NFC')
    if (post?.cloudId && authUser) {
      const { error } = await supabase.from('post_comments').insert({ post_id: post.cloudId, user_id: authUser.id, content: text })
      if (error) { setToast('Could not add your comment'); return }
    }
    setComments(current => ({ ...current, [id]: [...(current[id] || []), text] }))
    setPosts(items => items.map(item => item.id === id ? { ...item, comments: item.comments + 1 } : item)); setCommentText('')
  }
  const makeStory = async () => {
    if (isGenerating) return
    if (!childName.trim()) { setToast('Add a child’s name to begin'); return }
    const child = childName.trim(); const idea = theme.trim() || 'a magical adventure'
    setIsGenerating(true)
    try {
      const { title, text } = await generateKidsStory({ child, age, topic: idea })
      setGenerated({ title, child, theme: idea, text, date: '' })
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Could not create a story. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }
  const [savingKidStory, setSavingKidStory] = useState(false)
  const saveKidStory = async () => {
    if (!generated || !authUser || savingKidStory) return
    if (generated.id) { setGenerated(null); return }
    setSavingKidStory(true)
    try {
      const { data, error } = await supabase.from('kids_stories').insert({ user_id: authUser.id, title: generated.title, content: JSON.stringify({ title: generated.title, child: generated.child, theme: generated.theme, text: generated.text }) }).select('id,created_at').single()
      if (error) throw error
      setKidStories(items => [{ ...generated, id: data.id, createdAt: data.created_at }, ...items])
      setToast('Saved to your story library'); setGenerated(null)
    } catch { setToast('Something went wrong. Please try again.') }
    finally { setSavingKidStory(false) }
  }
  const submitAccount = async (event: React.FormEvent) => {
    event.preventDefault()
    if (accountBusy) return
    setAccountBusy(true)
    const email = accountEmail.trim().toLowerCase()
    const password = accountPassword
    try {
      if (accountMode === 'join') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: accountName.trim() } } })
        if (error) throw error
        if (!data.user || (data.user.identities && data.user.identities.length === 0)) throw new Error('This email is already registered. Please sign in.')
        let user = data.user
        if (!data.session) {
          const signedIn = await supabase.auth.signInWithPassword({ email, password })
          if (signedIn.error) throw signedIn.error
          user = signedIn.data.user
        }
        setProfile(current => ({ ...current, name: accountName.trim(), handle: accountName.trim().toLowerCase().replace(/\s+/g, '') }))
        setAuthUser(user)
        setIsMember(true); setModal(null)
        setToast('Welcome to the nest!')
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        setAuthUser(data.user)
        setIsMember(true); setModal(null); setToast('Welcome back!')
      }
      setAccountPassword('')
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (/already registered|already been registered|already exists/i.test(message)) setToast('This email is already registered. Please sign in.')
      else if (/invalid login credentials|invalid credentials/i.test(message)) setToast('Invalid email or password.')
      else if (/email not confirmed/i.test(message)) setToast('Could not sign in. Please try again.')
      else if (/password/i.test(message) && /least|weak|short/i.test(message)) setToast('Password must be at least 6 characters.')
      else setToast(message || 'Could not sign in')
    }
    finally { setAccountBusy(false) }
  }

  const forgotPassword = async () => {
    const email = accountEmail.trim().toLowerCase()
    if (!email) { setAuthNote('Enter your email address above first, then tap Forgot password.'); return }
    setAccountBusy(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: confirmationRedirect() })
      if (error) throw error
      setAuthNote('If an account exists for ' + email + ', a password-reset email is on its way. Open it, tap the link, and choose a new password here in MingleNest. Check Spam if you do not see it.')
    } catch (error) { setAuthNote(error instanceof Error ? error.message : 'Could not send the reset email. Please try again.') }
    finally { setAccountBusy(false) }
  }
  const saveNewPassword = async (event: React.FormEvent) => {
    event.preventDefault()
    if (newPw.length < 6) { setAuthNote('Password must be at least 6 characters.'); return }
    setAccountBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw })
      if (error) throw error
      setNewPw(''); setRecovery(false); setAuthNote(''); setToast('Password updated. Welcome back!')
    } catch (error) { setAuthNote(error instanceof Error ? error.message : 'Could not update password') }
    finally { setAccountBusy(false) }
  }
  const signInGoogle = async () => {
    if (accountBusy) return
    setAccountBusy(true)
    try {
      const native = Capacitor.isNativePlatform()
      const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: confirmationRedirect(), skipBrowserRedirect: native } })
      if (error) throw error
      if (native && data.url) await Browser.open({ url: data.url })
    } catch (error) { setToast(error instanceof Error ? error.message : 'Could not sign in') }
    finally { setAccountBusy(false) }
  }
  if (!authReady || !authUser || recovery) return localizeView(<main className="auth-gate" dir={language === 'ar' ? 'rtl' : 'ltr'}><section className="auth-gate-card"><img className="auth-gate-logo" src="/minglenest-logo.png" alt="MingleNest" /><h1 translate="no">MingleNest</h1><div className="language-toolbar"><label htmlFor="auth-language">Language</label><select id="auth-language" value={language} onChange={event => setLanguage(event.target.value as Language)}>{languages.map(([code, name]) => <option key={code} value={code} translate="no">{name}</option>)}</select></div>{!authReady ? <p role="status">Loading...</p> : recovery ? <><h2>Choose a new password</h2><form className="account-form" onSubmit={saveNewPassword}><label>New password<input required type={showPw ? 'text' : 'password'} minLength={6} value={newPw} onChange={event => setNewPw(event.target.value)} autoComplete="new-password" name="new-password" /></label><button type="button" className="text-link" onClick={() => setShowPw(v => !v)}>{showPw ? 'Hide password' : 'Show password'}</button><button className="primary-button" disabled={accountBusy}>{accountBusy ? 'Loading...' : 'Save new password'}</button></form>{authNote && <p role="status">{authNote}</p>}</> : <><h2>{accountMode === 'join' ? 'Create an account' : 'Sign in'}</h2><form className="account-form" onSubmit={submitAccount}>{accountMode === 'join' && <label>Your name<input required value={accountName} onChange={event => setAccountName(event.target.value)} autoComplete="name" /></label>}<label>Email<input required type="email" name="email" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={accountEmail} onChange={event => setAccountEmail(event.target.value)} autoComplete="username" /></label><label>Password<input required type={showPw ? 'text' : 'password'} name="password" minLength={6} autoCapitalize="none" autoCorrect="off" spellCheck={false} value={accountPassword} onChange={event => setAccountPassword(event.target.value)} autoComplete={accountMode === 'join' ? 'new-password' : 'current-password'} /></label><button type="button" className="text-link" onClick={() => setShowPw(v => !v)}>{showPw ? 'Hide password' : 'Show password'}</button><button className="primary-button" disabled={accountBusy}>{accountBusy ? 'Loading...' : accountMode === 'join' ? 'Create an account' : 'Sign in'}</button>{accountMode === 'login' && <button type="button" className="text-link" disabled={accountBusy} onClick={forgotPassword}>Forgot password?</button>}{authNote && <p role="status">{authNote}</p>}</form><button className="text-link" onClick={() => setAccountMode(accountMode === 'join' ? 'login' : 'join')}>{accountMode === 'join' ? 'Sign in' : 'Create an account'}</button></>}{toast && <p role="status">{toast}</p>}</section></main>, language)

  return localizeView(<div className="app-shell">
    <aside className="desktop-rail">
      <button className="brand desktop-brand" onClick={() => openTab('home')} aria-label="MingleNest home"><span className="brand-mark"><img src="/minglenest-logo.png" alt="" /></span><span>Mingle<span className="brand-light">Nest</span></span></button>
      <div className="rail-caption">YOUR LITTLE CORNER OF THE WORLD</div>
      <nav className="rail-nav" aria-label="Main navigation">{tabs.map(({ id, label, Icon }) => <button key={id} className={`rail-link ${tab === id ? 'active' : ''}`} onClick={() => openTab(id)}><Icon size={21} strokeWidth={tab === id ? 2.3 : 1.9} /><span>{label}</span>{id === 'chats' && (chatNotice.unreadTotal > 0 ? <span className="nav-badge" aria-label={`${chatNotice.unreadTotal} unread messages`}>{chatNotice.unreadTotal > 99 ? '99+' : chatNotice.unreadTotal}</span> : <span className="nav-dot" />)}</button>)}</nav>
      <div className="rail-bottom"><div className="rail-note"><span className="note-sparkle"><Sparkles size={20} /></span><strong>Make a little magic</strong><p>Turn their big imagination into a bedtime story.</p><button onClick={() => openTab('create')}>Create a story <ArrowRight size={15} /></button></div><button className="rail-person" onClick={() => openTab('profile')}><Avatar name={profile.name} image={profile.avatarUrl} size="small" color="sage" /><span><strong>{profile.name}</strong><small>@{profile.handle}</small></span><ChevronRight size={18} /></button></div>
    </aside>

    <main className="main-area">
      <header className="mobile-topbar"><button className="brand" onClick={() => openTab('home')} aria-label="MingleNest home"><span className="brand-mark"><img src="/minglenest-logo.png" alt="" /></span><span>Mingle<span className="brand-light">Nest</span></span></button><button className="icon-button" onClick={() => setModal('notifications')} aria-label="Notifications"><Bell size={21} /></button></header>
      <div className="page-content">
      <div className="language-toolbar"><label htmlFor="mn-language">Language</label><select id="mn-language" value={language} onChange={event => setLanguage(event.target.value as Language)} aria-label="Language">{languages.map(([code, name]) => <option key={code} value={code} lang={code} translate="no">{name}</option>)}</select></div>
      {tab === 'home' && <>
        <div className="home-heading"><div><div className="eyebrow">YOUR SPACE TO CONNECT <span className="eyebrow-line" /></div><h1>Good to see you, <em>{profile.name.split(' ')[0]}.</em></h1><p>Here’s what’s happening in your little corner of the world.</p></div><button className="desktop-action" onClick={() => setModal('post')}><Plus size={18} /> Share a moment</button></div>
        <div className="home-layout"><div className="feed-column">
          <section className="story-strip"><div className="section-row"><h2>Little moments</h2></div><StatusRow userId={authUser?.id} extras={groupByOwner(dailyStories)} onAdd={() => setModal('story')} onExtra={(i) => setSelectedStory(i)} onOpenTab={() => openTab('stories')} /></section>
          <button className="composer" onClick={() => setModal('post')}><Avatar name={profile.name} color="sage" size="small" /><span>What's on your mind, {profile.name.split(' ')[0]}?</span><span className="composer-plus"><Plus size={18} /></span></button>
          <div className="section-row feed-title"><div><h2>From your circle</h2><p>The moments worth sharing</p></div><span className="feed-label">LATEST</span></div>
          <div className="post-list">{posts.map(post => <article className="post-card" key={post.id}><div className="post-header"><button type="button" className="name-link" disabled={!post.ownerId} aria-label="Open profile" onClick={() => { if (post.ownerId) setProfileOf({ id: post.ownerId, name: post.author }) }}><Avatar name={post.author} image={post.avatarUrl || (post.author === 'Maya Chen' ? photos.portrait : undefined)} color={post.author === 'Olivia Park' ? 'lilac' : post.author === 'Leo Martin' ? 'sage' : 'yellow'} /></button><div className="post-author">{post.ownerId ? <button type="button" className="name-link" onClick={() => setProfileOf({ id: post.ownerId!, name: post.author })}><strong>{post.author}</strong></button> : <strong>{post.author}</strong>}<span>{post.ownerId ? <button type="button" className="name-link" onClick={() => setProfileOf({ id: post.ownerId!, name: post.author })}>@{post.handle}</button> : <>@{post.handle}</>} · <time dateTime={post.createdAt}>{formatCreatedAt(post.createdAt, language)}</time></span></div><div className="post-menu-wrap"><button className="subtle-icon" onClick={() => setMenuPost(menuPost === post.id ? null : post.id)} aria-label="More post options" aria-expanded={menuPost === post.id}><Ellipsis size={21} /></button>{menuPost === post.id && <><div className="menu-scrim" onClick={() => setMenuPost(null)} /><div className="post-menu" role="menu">{canDeletePost(post) && <button role="menuitem" className="danger" onClick={() => askDeletePost(post.id)}><Trash2 size={16} /> Delete Post</button>}<button role="menuitem" onClick={() => { setMenuPost(null); setToast('Thanks — we’ll review this post') }}><Flag size={16} /> Report Post</button></div></>}</div></div><p className="post-text" translate="no">{post.text}</p>{post.image && <img className="post-image" src={post.image} alt={`A moment shared by ${post.author}`} onClick={() => setOpenPost(post)} style={{ cursor: 'pointer' }} />}{post.video && <><SafeVideo src={post.video} label={`Video shared by ${post.author}`} /><button type="button" className="text-link open-post-link" onClick={() => setOpenPost(post)}>Open full post</button></>}{!post.video && post.videoPath && <p className="post-media-missing" role="status">This video could not be loaded right now. Please try again later.</p>}<div className="post-actions"><button className={post.liked ? 'liked' : ''} onClick={() => toggleLike(post.id)} aria-label="Like post"><Heart size={19} fill={post.liked ? 'currentColor' : 'none'} /><span>{post.likes}</span></button><button onClick={() => setShowComments(showComments === post.id ? null : post.id)} aria-label="View comments"><MessageCircle size={19} /><span>{post.comments}</span></button><button onClick={() => { navigator.clipboard?.writeText(window.location.href); setToast('Link copied to clipboard') }} aria-label="Share post"><Share2 size={18} /><span>Share</span></button><button className={`save-action ${post.saved ? 'liked' : ''}`} onClick={() => toggleSave(post.id)} aria-label="Save post"><Bookmark size={19} fill={post.saved ? 'currentColor' : 'none'} /></button></div>{showComments === post.id && (post.cloudId ? <CommentThread targetId={post.cloudId} kind="post" userId={authUser?.id || null} language={language} onError={setToast} focusId={focusComment} onCount={count => setPosts(current => current.map(p => p.id === post.id && p.comments !== count ? {...p, comments: count} : p))} /> : <div className="comments-area"><p>This sample moment does not accept public comments.</p></div>)}</article>)}</div>
        </div><aside className="home-side"><div className="welcome-card"><div className="welcome-icon"><Heart size={20} fill="currentColor" /></div><h3>A place to feel at home.</h3><p>Share the ordinary, celebrate the extraordinary, and stay close to your people.</p><span>GOOD THINGS GROW TOGETHER</span></div><div className="side-section"><div className="section-row"><h3>Your people</h3><button onClick={() => openTab('chats')} className="text-link">View chats <ArrowRight size={14} /></button></div>{people.slice(0, 3).map(person => <button className="person-row" key={person.name} onClick={() => openChat(person.name, contacts.find(contact => contact.name === person.name)?.id ?? null)}><Avatar name={person.name} image={person.image} color={person.color} size="small" /><span><strong>{person.name}</strong><small>Say hello</small></span><MessageCircle size={17} /></button>)}</div></aside></div>
      </>}

      {tab === 'stories' && <div className="standard-page">{authUser && <StatusPanel userId={authUser.id} language={language} />}<div className="page-heading"><div className="eyebrow">LIFE, AS IT HAPPENS <span className="eyebrow-line" /></div><h1>Daily <em>stories.</em></h1><p>A little window into the moments your people are making.</p></div><button className="primary-button story-create" onClick={() => setModal('story')}><Plus size={18} /> Add to your story</button><div className="story-grid">{groupByOwner(dailyStories).map(g => g.index).map((index) => { const story = dailyStories[index]; return <button className={`story-tile story-tile-${index % 4}`} key={`${story.name}-${index}`} onClick={() => setSelectedStory(index)}>{story.image && <img src={story.image} alt="" />}<div className="story-tile-shade" /><div className="story-tile-top"><Avatar name={story.name} image={story.name === 'Olivia Park' ? photos.portrait : undefined} size="small" color="lilac" /><span>{story.name}</span></div><div className="story-tile-text" translate="no">{story.text}</div></button> })}</div></div>}

      {tab === 'chats' && <div className="standard-page chat-page"><div className={`chats-head ${activeChat ? 'chat-list-hidden' : ''}`}><h1>Chats</h1>{authUser && <button disabled={recording || !!voiceDraft} onClick={() => { setActiveChat(null); setActiveContactId(null); window.dispatchEvent(new Event('minglenest-add-contact')) }} aria-label="New message"><Plus size={20} /></button>}</div>{!authUser && <button className="secondary-button" onClick={() => { setAccountMode('login'); setModal('account') }}>Sign in to chat with your people</button>}<div className="chat-layout"><div className={`chat-list ${activeChat ? 'chat-list-hidden' : ''}`}>{authUser && <ContactsPanel key={authUser.id} language={language} onError={setToast} onChat={person => { setContacts(current => current.some(item => item.id === person.id) ? current : [...current, person]); openChat(person.name, person.id) }}><ChatList userId={authUser.id} contacts={contacts} unreadBy={chatNotice.unreadBy} activeId={activeContactId} refreshKey={privateMessages.length} onOpen={openChat} /></ContactsPanel>}</div><div className={`chat-thread ${activeChat ? 'thread-open' : ''}`}>{activeChat ? <><div className="thread-header"><button className="back-button" onClick={() => { if (recording) stopRecording(true); setVoiceDraft(null); setActiveChat(null); setActiveContactId(null) }} aria-label="Back to chats"><ArrowLeft size={20} /></button><button type="button" className="thread-profile-link" disabled={!activeContactId} onClick={() => { if (activeContactId) setProfileOf({ id: activeContactId, name: activeChat }) }} aria-label={`Open ${activeChat}'s profile`}><Avatar name={activeChat} color="peach" size="small" /><div><strong>{activeChat}</strong><small>Tap to view profile</small></div></button></div><div className="thread-messages"><div className="day-divider">MESSAGES</div>{privateMessages.map(message => <div className={`message-bubble ${message.sender_user_id === authUser?.id ? 'mine' : ''}`} key={message.id}>{message.message_type === 'voice' && message.audio_path ? <VoicePlayer path={message.audio_path} durationMs={message.duration_ms || 0} language={language} messageId={message.id} trackFor={message.sender_user_id !== authUser?.id ? authUser?.id : undefined} /> : message.message_type !== 'text' ? <ChatMessageBody message={message} myId={authUser?.id} language={language} onError={setToast} /> : <span translate="no">{message.content}</span>}<small><time dateTime={message.created_at}>{formatCreatedAt(message.created_at, language)}</time></small>{message.sender_user_id === authUser?.id && <button className="message-delete" onClick={() => setDeletingMessageId(message.id)} aria-label="Delete message"><Trash2 size={13} /></button>}</div>)}</div>{recording || voiceDraft ? <div className="message-form voice-composer"><span className="voice-status">{recording ? (voicePaused ? 'Paused' : 'Recording') : 'Voice message'} · {voiceTime(recording ? recordingMs : voiceDraft?.durationMs || 0)}</span>{recording ? <><button type="button" onClick={togglePauseRecording} aria-label={voicePaused ? 'Resume recording' : 'Pause recording'}>{voicePaused ? <Mic size={18} /> : <Pause size={18} />}</button><button type="button" onClick={() => stopRecording()} aria-label="Stop recording"><Square size={18} /></button></> : <>{voiceDraft && <VoiceDraftPreview blob={voiceDraft.blob} />}<button type="button" onClick={reRecord} aria-label="Record again"><Mic size={18} /></button><button type="button" onClick={sendRecording} disabled={chatBusy} aria-label="Send voice message"><Send size={18} /></button></>}<button type="button" onClick={() => stopRecording(true)} aria-label="Cancel voice message"><X size={18} /></button></div> : <form className="message-form" onSubmit={e => { e.preventDefault(); sendMessage() }}><input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Write a message..." aria-label="Write a message" disabled={!chatId || chatBusy} /><EmojiButton disabled={!chatId || chatBusy} onPick={emoji => setChatInput(value => value + emoji)} /><ChatAttachments chatId={chatId} userId={authUser?.id} contacts={contacts} disabled={chatBusy} onSent={m => setPrivateMessages(prev => prev.some(item => item.id === m.id) ? prev : [...prev, m])} onError={setToast} /><button type="button" onClick={startRecording} disabled={!chatId || chatBusy} aria-label="Record voice message"><Mic size={18} /></button><button type="submit" disabled={!chatId || chatBusy} aria-label="Send message"><Send size={18} /></button></form>}</> : <div className="chat-empty"><span><MessageCircle size={28} /></span><h3>Closer, one message at a time.</h3><p>Choose a conversation to catch up with your people.</p></div>}</div></div></div>}

      {tab === 'create' && <div className="standard-page kids-page"><div className="page-heading"><div className="eyebrow">A LITTLE MAGIC, JUST FOR THEM <span className="eyebrow-line" /></div><h1>Kids’ <em>stories.</em></h1><p>Make them the hero of a one-of-a-kind bedtime adventure.</p></div>{generated ? <div className="generated-story"><button className="text-link" onClick={() => setGenerated(null)}><ArrowLeft size={16} /> Back to creator</button><div className="generated-cover"><span><Sparkles size={20} /> A STORY FOR {generated.child.toUpperCase()}</span><h2 translate="no">{generated.title}</h2><Moon size={35} /></div>{generated.createdAt && <time dateTime={generated.createdAt}>{formatCreatedAt(generated.createdAt, language)}</time>}<div className="story-body" translate="no">{generated.text.split('\n\n').map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div><div className="generated-actions"><button className="primary-button" disabled={savingKidStory} onClick={saveKidStory}><Bookmark size={17} /> Save this story</button><button className="secondary-button" onClick={() => { setGenerated(null); setChildName('') }}>Create another</button></div></div> : <><div className="kids-hero"><div className="kids-hero-content"><span className="kids-tag"><Sparkles size={14} /> MADE WITH IMAGINATION</span><h2>Every child deserves to be the hero.</h2><p>Dream up a story you can read together, tonight and for years to come.</p></div><div className="book-art" aria-hidden="true"><div className="art-star star-one">✦</div><div className="art-star star-two">✧</div><div className="art-moon" /><div className="art-book"><div className="book-left" /><div className="book-right" /><div className="book-spine" /></div></div></div><div className="creator-card"><div className="creator-heading"><span className="creator-icon"><WandSparkles size={20} /></span><div><h2>Let’s make a story</h2><p>Just a few details, and the adventure begins.</p></div></div><div className="form-grid"><label>Child’s name<input value={childName} onChange={e => setChildName(e.target.value)} placeholder="e.g. Charlie" /></label><label>Age range<select value={age} onChange={e => setAge(e.target.value)}><option>2–3 years</option><option>4–6 years</option><option>7–9 years</option></select></label><label className="full-field">What should the story be about?<input value={translate(theme, language)} onChange={e => setTheme(e.target.value)} placeholder="A magical adventure" /></label></div><div className="theme-suggestions"><span>TRY AN IDEA</span>{['A friendly dragon', 'Under the sea', 'A journey to the moon'].map(idea => <button className={theme === idea ? 'chosen' : ''} onClick={() => setTheme(idea)} key={idea}>{idea}</button>)}</div><button className="primary-button generate-button" onClick={makeStory} disabled={isGenerating}><Sparkles size={18} /> {isGenerating ? 'Creating their story...' : 'Create their story'} <ArrowRight size={17} /></button><p className="creator-note">A fresh adventure inspired by their name, age, and imagination.</p></div><div className="library-section"><div className="section-row"><div><h2>Your story shelf</h2><p>Every adventure you’ve saved, all in one place.</p></div><span className="library-count">{kidStories.length} STORIES</span></div>{kidStories.length ? <div className="library-list">{kidStories.map((story, index) => <div className="library-item" key={story.id ?? index}><button onClick={() => setGenerated(story)}><span className="library-book"><BookHeart size={23} /></span><span><strong translate="no">{story.title}</strong><small>For {story.child} · <time dateTime={story.createdAt}>{formatCreatedAt(story.createdAt, language)}</time></small></span><ChevronRight size={19} /></button><button className="library-delete" onClick={() => setConfirmDel({ kind: 'story', detail: story.title, run: () => void deleteKidStory(story, index) })} aria-label={`Delete ${story.title}`}><Trash2 size={18} /></button></div>)}</div> : <div className="empty-library"><BookHeart size={25} /><span>Your next favorite bedtime story starts here.</span></div>}</div></>}</div>}

      {tab === 'profile' && <div className="standard-page profile-page"><div className="page-heading"><div className="eyebrow">A SPACE THAT’S YOURS <span className="eyebrow-line" /></div><h1>Your <em>profile.</em></h1><p>The little things that make you, you.</p></div><div className="profile-card"><div className={`profile-cover ${shown.coverUrl ? 'has-image' : ''}`} style={shown.coverUrl ? { backgroundImage: `url(${shown.coverUrl})` } : undefined}><div className="cover-orbit orbit-one" /><div className="cover-orbit orbit-two" /><span>THE GOOD IN EVERY DAY ✦</span></div><div className="profile-details"><div className="profile-avatar"><Avatar name={shown.name} image={shown.avatarUrl} size="large" color="sage" /></div><button className="edit-profile" onClick={() => { setDraftProfile(profile); setAvatarFile(null); setCoverFile(null); setModal('profile') }}><Pencil size={16} /> Edit profile</button><h2>{profile.name}</h2><div className="profile-handle">@{profile.handle}</div><p translate="no">{profile.bio}</p></div></div><div className="profile-posts"><div className="section-row"><div><h2>Your moments</h2><p>Little pieces of your story.</p></div><button className="text-link" onClick={() => setModal('post')}><Plus size={16} /> New post</button></div>{authUser && <ProfileMedia userId={authUser.id} language={language} refreshKey={posts.length} onDeleted={id => setPosts(items => items.filter(item => String(item.cloudId) !== String(id)))} />}</div><button className="account-link" onClick={() => setModal('account')}><Mail size={18} /> {isMember ? 'Account details' : 'Create your account'} <ChevronRight size={18} /></button><button className="delete-account-link" onClick={() => setModal('delete')}>Delete account</button></div>}
      </div>
    </main>
    <nav className="mobile-nav" aria-label="Main navigation">{tabs.map(({ id, label, Icon }) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => openTab(id)}><Icon size={22} strokeWidth={tab === id ? 2.5 : 1.9} /><span>{label}</span>{id === 'chats' && chatNotice.unreadTotal > 0 && <span className="nav-badge" aria-label={`${chatNotice.unreadTotal} unread messages`}>{chatNotice.unreadTotal > 99 ? '99+' : chatNotice.unreadTotal}</span>}</button>)}</nav>
    {selectedStory !== null && dailyStories[selectedStory] && <div className="story-viewer" onClick={() => setSelectedStory(null)}><div className="viewer-panel" onClick={e => e.stopPropagation()}>{dailyStories[selectedStory].image && <StoryMedia key={`${dailyStories[selectedStory].id ?? selectedStory}`} src={dailyStories[selectedStory].image!} />}<div className="viewer-shade" /><div className="viewer-progress" /><div className="viewer-header"><button type="button" className="name-link viewer-profile-link" disabled={!dailyStories[selectedStory].ownerId} aria-label={`Open ${dailyStories[selectedStory].name}'s profile`} onClick={() => { const s = dailyStories[selectedStory]; if (s.ownerId) { setProfileOf({ id: s.ownerId, name: s.name }); setSelectedStory(null) } }}><Avatar name={dailyStories[selectedStory].name} size="small" color="sage" /><strong>{dailyStories[selectedStory].name}</strong></button><time dateTime={dailyStories[selectedStory].createdAt}>{formatCreatedAt(dailyStories[selectedStory].createdAt, language)}</time><div className="viewer-menu-wrap"><button onClick={() => setStoryMenu(open => !open)} aria-label="More story options" aria-expanded={storyMenu}><Ellipsis size={23} /></button>{storyMenu && <div className="post-menu viewer-menu" role="menu">{(dailyStories[selectedStory].ownerId ? dailyStories[selectedStory].ownerId === authUser?.id : dailyStories[selectedStory].name === profile.name) && <button role="menuitem" className="danger" onClick={() => { setStoryMenu(false); setConfirmStory(selectedStory) }}><Trash2 size={16} /> Delete Story</button>}<button role="menuitem" onClick={() => shareStory(selectedStory)}><Share2 size={16} /> Share</button></div>}</div><button onClick={() => { setStoryMenu(false); setSelectedStory(null) }} aria-label="Close story"><X size={23} /></button></div><div className="viewer-content" translate="no">{dailyStories[selectedStory].text}</div>{typeof dailyStories[selectedStory].id === 'string' && <StoryInteractions focusId={focusComment} key={dailyStories[selectedStory].id} storyId={dailyStories[selectedStory].id as string} userId={authUser?.id || null} language={language} onError={setToast} />}<button className="viewer-prev" onClick={() => { setStoryMenu(false); setSelectedStory((selectedStory - 1 + dailyStories.length) % dailyStories.length) }} aria-label="Previous story"><ChevronLeft size={24} /></button><button className="viewer-next" onClick={() => setSelectedStory((selectedStory + 1) % dailyStories.length)} aria-label="Next story"><ChevronRight size={24} /></button></div></div>}
    {profileOf && authUser && <PublicProfileModal userId={profileOf.id} name={profileOf.name} language={language} onClose={() => setProfileOf(null)} onError={setToast} />}
    {confirmStory !== null && <div className="confirm-backdrop" role="presentation"><div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-label="Delete this story?"><h3>Delete this story?</h3><div><button type="button" onClick={() => setConfirmStory(null)}>Cancel</button><button type="button" className="danger" onClick={() => { const index = confirmStory; setConfirmStory(null); void deleteStory(index) }}>Delete story</button></div></div></div>}
    {confirmDel && <div className="confirm-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setConfirmDel(null) }}><div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-label={`Delete this ${confirmDel.kind}?`}><h3>{`Delete this ${confirmDel.kind}?`}</h3>{confirmDel.detail && <p style={{ margin: '0 0 14px', color: '#5b5675', fontSize: 14, overflowWrap: 'anywhere' }}>“{confirmDel.detail}”</p>}<div><button type="button" onClick={() => setConfirmDel(null)}>Cancel</button><button type="button" className="danger" onClick={() => { const run = confirmDel.run; setConfirmDel(null); run() }}>{`Delete ${confirmDel.kind}`}</button></div></div></div>}
    <ChatNoticeBanner notice={chatNotice.notice} onClose={chatNotice.dismiss} onOpen={(id, name) => { setTab('chats'); openChat(name, id) }} />
    {openPost && <PostDetailModal post={openPost} userId={authUser?.id ?? null} language={language} onClose={() => setOpenPost(null)} onError={setToast} onProfile={openPost.ownerId ? () => { setProfileOf({ id: openPost.ownerId!, name: openPost.author }); setOpenPost(null) } : undefined} />}
    {modal && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null) }}><div className="modal-panel"><div className="modal-top"><h2>{modal === 'post' ? 'Share a moment' : modal === 'story' ? 'Add to your story' : modal === 'profile' ? 'Edit profile' : modal === 'notifications' ? 'Notifications' : modal === 'delete' ? 'Delete account' : isMember ? 'Your account' : 'Join MingleNest'}</h2><button onClick={() => setModal(null)} aria-label="Close"><X size={21} /></button></div>{modal === 'post' && <div className="modal-content"><div className="modal-person"><Avatar name={profile.name} color="sage" size="small" /><span><strong>{profile.name}</strong><small>Sharing with your circle</small></span></div><textarea autoFocus value={postText} onChange={e => setPostText(e.target.value)} placeholder="What’s a little moment you’d like to share?" rows={5} />{postImage && postFile?.type.startsWith('video/') && <SafeVideo src={postImage} label="Selected video preview" />}<div className="post-kind-row"><label className={`story-picker post-kind ${postImage && !postFile?.type.startsWith('video/') ? 'has-image' : ''}`} style={postImage && !postFile?.type.startsWith('video/') ? { backgroundImage: `url(${postImage})` } : undefined}><input type="file" accept="image/*" onChange={pickPostImage} aria-label="Choose a photo" disabled={savingPost}/><span className="media-badge"><ImagePlus size={15} /> {postImage && !postFile?.type.startsWith('video/') ? 'Change photo' : 'Photo post'}</span></label><label className="story-picker post-kind"><input type="file" accept="video/*" onChange={pickPostImage} aria-label="Choose a video" disabled={savingPost}/><span className="media-badge"><ImagePlus size={15} /> {postFile?.type.startsWith('video/') ? 'Change video' : 'Video post'}</span></label></div><button className="primary-button modal-submit" onClick={publishPost} disabled={(!postText.trim() && !postFile) || savingPost}>{savingPost ? 'Sharing...' : 'Share moment'} <ArrowRight size={17} /></button></div>}{modal === 'story' && <div className="modal-content"><p className="modal-description">A small glimpse into your day, shared with your people.</p><textarea autoFocus value={storyText} onChange={e => setStoryText(e.target.value)} placeholder="What’s happening today?" rows={4} /><label className={`story-picker ${storyImage ? 'has-image' : ''}`} style={storyImage ? { backgroundImage: `url(${storyImage})` } : undefined}><input type="file" accept="image/*" onChange={pickStoryImage} aria-label="Choose a story photo" /><span className="media-badge"><ImagePlus size={15} /> {storyImage ? 'Change photo' : 'Choose a photo'}</span></label><button className="primary-button modal-submit" onClick={publishStory} disabled={(!storyText.trim() && !storyFile) || savingStory}>{savingStory ? 'Sharing...' : 'Share story'} <ArrowRight size={17} /></button></div>}{modal === 'profile' && <div className="modal-content profile-form"><div className="media-edit"><label className={`cover-edit ${draftProfile.coverUrl ? 'has-image' : ''}`} style={draftProfile.coverUrl ? { backgroundImage: `url(${draftProfile.coverUrl})` } : undefined}><input type="file" accept="image/*" onChange={e => pickImage(e, 'cover')} aria-label="Choose cover photo" /><span className="media-badge"><Camera size={15} /> {draftProfile.coverUrl ? 'Change cover' : 'Add cover photo'}</span></label><label className="avatar-edit"><input type="file" accept="image/*" onChange={e => pickImage(e, 'avatar')} aria-label="Choose profile picture" /><Avatar name={draftProfile.name || '?'} image={draftProfile.avatarUrl} size="large" color="sage" /><span className="avatar-camera"><Camera size={14} /></span></label></div><label className="input-label">Your name<input value={draftProfile.name} onChange={e => setDraftProfile({ ...draftProfile, name: e.target.value })} /></label><label className="input-label">Username<input value={draftProfile.handle} onChange={e => setDraftProfile({ ...draftProfile, handle: e.target.value.replace(/\s/g, '').toLowerCase() })} /></label><label className="input-label">A little about you<textarea rows={3} value={draftProfile.bio} onChange={e => setDraftProfile({ ...draftProfile, bio: e.target.value })} /></label><button className="primary-button modal-submit" onClick={saveProfile} disabled={savingProfile}>{savingProfile ? 'Saving...' : 'Save changes'} <Check size={17} /></button></div>}{modal === 'notifications' && authUser && <SocialActivity userId={authUser.id} language={language} onOpen={async (kind, target, comment) => { if (kind === 'post') { let post = posts.find(p => p.cloudId === target); if (!post) { const {data,error} = await supabase.from('posts').select('id,user_id,content,image_url,video_path,created_at').eq('id',target).maybeSingle(); if (error || !data) { setToast('This post is no longer available'); return } const {data:author} = await supabase.from('profiles').select('username,full_name,avatar_url').eq('id',data.user_id).maybeSingle(); let video: string | undefined; if (data.video_path) { const {data:link} = await supabase.storage.from('post-videos').createSignedUrl(data.video_path,3600); video=link?.signedUrl } const [reactionRows,commentRows]=await Promise.all([supabase.from('post_reactions').select('user_id').eq('post_id',data.id),supabase.from('post_comments').select('id').eq('post_id',data.id).is('deleted_at',null)]); post={id:parseInt(data.id.replace(/-/g,'').slice(0,12),16),cloudId:data.id,ownerId:data.user_id,author:author?.full_name||'Member',handle:author?.username||'member',avatar:'M',avatarUrl:author?.avatar_url||undefined,time:'',createdAt:data.created_at,text:data.content||'',image:data.image_url||undefined,video,videoPath:data.video_path||undefined,likes:reactionRows.data?.length||0,liked:reactionRows.data?.some(r=>r.user_id===authUser.id),comments:commentRows.data?.length||0};setPosts(current=>[post!,...current]) } setFocusComment(comment); setShowComments(post.id); setTab('home'); setModal(null) } else { let index=dailyStories.findIndex(s=>s.id===target); if(index<0){ const {data,error}=await supabase.from('stories').select('id,user_id,caption,media_url,created_at').eq('id',target).maybeSingle(); if(error||!data){setToast('This story is no longer available');return} const {data:author}=await supabase.from('profiles').select('full_name,username').eq('id',data.user_id).maybeSingle(); index=dailyStories.length;setDailyStories(current=>[...current,{id:data.id,ownerId:data.user_id,name:author?.full_name||author?.username||'Member',text:data.caption||'',image:data.media_url||undefined,createdAt:data.created_at}]) } setFocusComment(comment);setModal(null);setTab('stories');setSelectedStory(index) } }} />}{modal === 'delete' && <div className="modal-content delete-content"><h3>Delete your MingleNest account?</h3><p>Deleting your account removes your profile, posts, stories and saved Kids’ stories. You’ll be taken to a short request form to confirm your details. Nothing is deleted until the request is processed.</p><button className="primary-button danger-button modal-submit" onClick={() => { window.open('https://docs.google.com/forms/d/e/1FAIpQLSet39JW9olvDYwSEqF9C6Vyx8obVpNaUU9Ahsqxbm--jOC62g/viewform?usp=dialog', '_blank', 'noopener,noreferrer'); setModal(null) }}>Request Account Deletion</button><button className="secondary-button modal-submit" onClick={() => setModal(null)}>Keep my account</button></div>}{modal === 'account' && <div className="modal-content">{authUser ? <div className="account-success"><span><Check size={25} /></span><h3>You’re part of the nest.</h3><p>Signed in as <bdi translate="no">{authUser.email}</bdi>. Your private chats are available across devices.</p><button className="secondary-button" onClick={async () => { await supabase.auth.signOut(); setIsMember(false); setModal(null); setToast('Signed out of this device') }}>Sign out</button></div> : <><p className="modal-description">A cozy space for your people, your moments, and your stories.</p><div className="account-switch"><button className={accountMode === 'join' ? 'active' : ''} onClick={() => setAccountMode('join')}>Create account</button><button className={accountMode === 'login' ? 'active' : ''} onClick={() => setAccountMode('login')}>Sign in</button></div><form className="account-form" onSubmit={submitAccount}>{accountMode === 'join' && <label className="input-label">Your name<input required value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="Alex Morgan" /></label>}<label className="input-label">Email address<input type="email" required value={accountEmail} onChange={e => setAccountEmail(e.target.value)} placeholder="you@example.com" /></label><label className="input-label">Password<input type="password" required minLength={6} value={accountPassword} onChange={e => setAccountPassword(e.target.value)} placeholder="At least 6 characters" /></label><button className="primary-button modal-submit" type="submit">{accountMode === 'join' ? 'Join the nest' : 'Sign in'} <ArrowRight size={17} /></button></form><p className="local-note">Your account is securely saved for chats across devices.</p></>}</div>}</div></div>}
    {deletingMessageId && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setDeletingMessageId(null) }}><div className="modal-panel" role="alertdialog" aria-modal="true" aria-labelledby="delete-message-title"><div className="modal-top"><h2 id="delete-message-title">Delete this message?</h2></div><div className="modal-content" style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}><button className="secondary-button" onClick={() => setDeletingMessageId(null)}>Cancel</button><button className="primary-button danger-button" onClick={() => { const message = privateMessages.find(item => item.id === deletingMessageId); if (message) void deletePrivateMessage(message) }} >Delete message</button></div></div></div>}
    {toast && <div className="toast" role="status" translate="no"><Check size={17} />{translateError(toast, language)}</div>}
  </div>, language)
}

export default App
